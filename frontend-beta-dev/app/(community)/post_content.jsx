import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Modal } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getPostDetail } from '../src/api/getPostDetail';
import NavBar from '../../assets/components/navbar';
import { likePost } from '../src/api/likePost';
import { commentPost } from '../src/api/commentPost';
import { likeComment } from '../src/api/likeComment';
import { deletePost } from '../src/api/PostEditDelete';
import { TokenManager } from '../src/config';
import ConfirmationModal from '../../assets/components/ConfirmationModal';
import ReportModal from '../../assets/components/ReportModal';
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';
import { useDispatch } from 'react-redux';
import { fetchPosts, removePostsByUser, toggleLikePost } from '../slices/postsSlice';
import { blockUser } from '../src/api/blocks';
import { REPORT_TARGET_TYPES } from '../src/api/reports';

const PostContent = () => {
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(true);
  const commentInputRef = useRef(null);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  // Active report target. When set, the reusable ReportModal is shown for the
  // chosen entity (the post itself or one of its comments).
  const [reportTarget, setReportTarget] = useState(null);
  const [isBlockModalVisible, setIsBlockModalVisible] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const { run: runLikePost, isRunning: isLikingPost } = useSingleFlightAction(`community:post-content-like:${id || 'unknown'}`);
  const { run: runSubmitComment, isRunning: isSubmittingComment } = useSingleFlightAction(`community:post-content-comment:${id || 'unknown'}`);

  useEffect(() => {
    const fetchPostDetail = async () => {
      try {
        setLoading(true);
        console.log('Fetching post with ID:', id);
        const data = await getPostDetail(id);
        console.log('Received post data:', data);
        setPost(data);
      } catch (error) {
        console.error('Error fetching post detail:', error);
        // Backend returns 400 "Post not found" when either side has blocked the
        // other; treat that the same as a 404 and show a friendly message.
        const status = error?.response?.status;
        const serverMessage = error?.response?.data?.message;
        if (status === 400 || status === 404) {
          setError('This post is unavailable.');
        } else {
          setError(serverMessage || error.message || 'Failed to fetch post');
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      console.log('Post ID from params:', id);
      fetchPostDetail();
    } else {
      console.log('No post ID provided');
      setError('No post ID provided');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    commentInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        console.log('Attempting to get user data from TokenManager');
        const userData = await TokenManager.getUserData();
        console.log('TokenManager returned userData:', userData);

        if (userData) {
          console.log('Setting currentUserId to:', userData.id);
          setCurrentUserId(userData.id);
        } else {
          console.log('TokenManager returned null or undefined userData');
        }
      } catch (error) {
        console.error('Error getting user data from TokenManager:', error);
      }
    };

    console.log('Running getCurrentUser effect');
    getCurrentUser();
  }, []);

  useEffect(() => {
    console.log('currentUserId changed to:', currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    if (post) {
      console.log('Post user data:', post.user);
      console.log('Visibility check:', {
        currentUserId,
        postUserId: post?.user?.userId,
        isVisible: currentUserId === post?.user?.userId
      });
    }
  }, [currentUserId, post]);

  const handleLike = async () => {
    await runLikePost(async () => {
      try {
        const result = await likePost(id);
        setPost(prev => {
          if (!prev) return prev;

          const nextIsLiked =
            typeof result?.liked === 'boolean' ? result.liked : !prev.isLiked;
          const nextNumberOfLikes =
            typeof result?.totalLikes === 'number'
              ? result.totalLikes
              : (prev.isLiked ? prev.numberOfLikes - 1 : prev.numberOfLikes + 1);

          return {
            ...prev,
            isLiked: nextIsLiked,
            numberOfLikes: nextNumberOfLikes
          };
        });
        dispatch(toggleLikePost.fulfilled({
          postId: id,
          liked: result?.liked,
          totalLikes: result?.totalLikes
        }, '', id));
      } catch (error) {
        console.error('Error handling like:', error);
      }
    });
  };

  const formatDate = (datetime) => {
    const date = new Date(datetime);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  const getTimeAgo = (datetime) => {
    const now = new Date();
    const past = new Date(datetime);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}days ago`;
    return `${Math.floor(diffInSeconds / 2592000)}months ago`;
  };

  const handleComment = async () => {
    if (!comment.trim()) return;

    await runSubmitComment(async () => {
      try {
        console.log('Attempting to post comment:', {
          postId: id,
          content: comment,
          replyTo: replyTo
        });

        const newComment = await commentPost(
          id,
          comment,
          replyTo?.commentId
        );

        console.log('New comment response:', newComment);

        setPost(prev => {
          console.log('Previous post state:', prev);
          console.log('Is this a reply?', !!replyTo);

          const updatedPost = {
            ...prev,
            comments: replyTo
              ? prev.comments.map(c => {
                console.log('Checking comment:', c.id, 'against replyTo:', replyTo.commentId);
                if (c.id === replyTo.commentId) {
                  console.log('Found parent comment, adding reply');
                  return {
                    ...c,
                    replies: [...(c.replies || []), newComment]
                  };
                }
                return c;
              })
              : [...prev.comments, newComment]
          };

          console.log('Updated post state:', updatedPost);
          return updatedPost;
        });

        setComment('');
        setReplyTo(null);
      } catch (error) {
        console.error('Error posting comment:', error);
      }
    });
  };

  const handleReply = (commentId, userName) => {
    console.log('handleReply called with:', { commentId, userName });
    setReplyTo({ commentId, userName });
    setComment(`@${userName} `);
    commentInputRef.current?.focus();
  };

  const handleCommentIconPress = () => {
    commentInputRef.current?.focus();
  };

  const handleCommentLike = async (commentId) => {
    try {
      const result = await likeComment(commentId);

      const updateCommentLikeState = (comments = []) => comments.map(comment => {
        if (comment.id === commentId) {
          const nextIsLiked =
            typeof result?.liked === 'boolean' ? result.liked : !comment.isLiked;
          const nextNumberOfLikes =
            typeof result?.totalLikes === 'number'
              ? result.totalLikes
              : (comment.isLiked ? comment.numberOfLikes - 1 : comment.numberOfLikes + 1);

          return {
            ...comment,
            isLiked: nextIsLiked,
            numberOfLikes: nextNumberOfLikes,
          };
        }

        if (Array.isArray(comment.replies) && comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateCommentLikeState(comment.replies),
          };
        }

        return comment;
      });

      setPost(prev => ({
        ...prev,
        comments: updateCommentLikeState(prev.comments)
      }));
    } catch (error) {
      console.error('Error handling comment like:', error);
    }
  };

  useEffect(() => {
    console.log('Current replyTo state:', replyTo);
    console.log('Current comment value:', comment);
  }, [replyTo, comment]);

  const handleDeletePost = async () => {
    try {
      setIsDeleteModalVisible(false);
      await deletePost(id);
      router.push('/community_home');
    } catch (error) {
      console.error('Error deleting post:', error);
      setIsDeleteModalVisible(true);
    }
  };

  const handleEditPost = () => {
    router.push({
      pathname: '/post',
      params: {
        mode: 'edit',
        postId: id,
        initialTopic: post.topic,
        initialTitle: post.title,
        initialContent: post.content,
        initialLocation: post.location
      }
    });
  };

  const openReport = (target) => {
    if (!target?.targetId) return;
    setReportTarget(target);
  };

  const handleBlockAuthor = async () => {
    const authorId = post?.user?.userId || post?.user?.id;
    if (!authorId) {
      setIsBlockModalVisible(false);
      return;
    }
    setIsBlocking(true);
    try {
      await blockUser(authorId);
      // Instantly remove their posts from the cached feed and trigger a fresh
      // fetch (the server will also have stopped returning their content).
      dispatch(removePostsByUser(authorId));
      dispatch(fetchPosts());
      setIsBlockModalVisible(false);
      // Per backend guidance, send the user back to a safe screen since the
      // detail view of any post by this author would now 400.
      router.replace('/community_home');
    } catch (error) {
      console.error('Error blocking user:', error);
      setIsBlockModalVisible(false);
    } finally {
      setIsBlocking(false);
    }
  };

  const MenuModal = ({ isVisible, onClose, onOptionSelect }) => {
    // The post user ID might also be using 'id' instead of 'userId'
    const postUserId = post?.user?.userId || post?.user?.id;

    // Convert both IDs to strings and trim any whitespace for comparison
    const isCurrentUserAuthor = currentUserId && postUserId &&
      String(currentUserId).trim() === String(postUserId).trim();

    console.log('MenuModal user check result:', {
      currentUserId,
      postUserId,
      isAuthor: isCurrentUserAuthor
    });

    const options = isCurrentUserAuthor
      ? [
        { label: 'Edit' },
        { label: 'Delete' }
      ]
      : [
        { label: 'Report post' },
        { label: 'Block user' }
      ];

    return (
      <Modal
        transparent={true}
        visible={isVisible}
        onRequestClose={onClose}
        animationType="fade"
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isCurrentUserAuthor ? 'Options' : 'Post actions'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.resetButton}>Cancel</Text>
            </TouchableOpacity>
          </View>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.modalOption}
              onPress={() => onOptionSelect(option.label)}
            >
              <Text style={styles.modalOptionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    );
  };

  const renderComment = (comment) => (
    <View key={comment.id} style={styles.commentContainer}>
      <View style={styles.commentHeader}>
        <TouchableOpacity
          onPress={() => router.push({
            pathname: '/publicprofile',
            params: { userId: comment.user.userId || comment.user.id }
          })}
          style={styles.commentUserImageTouchable}
        >
          <ExpoImage
            source={{ uri: comment.user.imageUrl }}
            style={styles.commentUserImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/publicprofile',
              params: { userId: comment.user.userId || comment.user.id }
            })}
          >
            <Text style={styles.commentUserName}>{comment.user.userName}</Text>
          </TouchableOpacity>
          <Text style={{ marginHorizontal: 3, color: "#fff" }}>.</Text>
          <Text style={styles.commentTime}>{getTimeAgo(comment.datetime)}</Text>
        </View>
      </View>
      <Text style={styles.commentContent}>{comment.content}</Text>
      <View style={styles.commentActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleCommentLike(comment.id)}
        >
          <Ionicons
            name={comment.isLiked ? "thumbs-up" : "thumbs-up-outline"}
            size={16}
            color="#fff"
          />
          <Text style={styles.actionText}>{comment.numberOfLikes}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleReply(comment.id, comment.user.userName)}
        >
          <Ionicons name="chatbubble-outline" size={16} color="#fff" />
          <Text style={styles.actionText}>{comment.replies ? comment.replies.length : 0}</Text>
        </TouchableOpacity>
        {String(currentUserId || '') !== String(comment.user?.userId || comment.user?.id || '') && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openReport({
              targetType: REPORT_TARGET_TYPES.COMMENT,
              targetId: comment.id,
              title: 'Report comment',
            })}
            hitSlop={6}
          >
            <Ionicons name="flag-outline" size={14} color="#888" />
            <Text style={[styles.actionText, { color: '#888', fontSize: 12 }]}>Report</Text>
          </TouchableOpacity>
        )}
      </View>
      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {comment.replies.map(reply => (
            <View key={reply.id} style={styles.replyContainer}>
              <View style={styles.commentHeader}>
                <ExpoImage
                  source={{ uri: reply.user.imageUrl }}
                  style={styles.commentUserImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.commentUserName}>{reply.user.userName}</Text>
                  <Text style={{ marginHorizontal: 3, color: "fff" }}>.</Text>
                  <Text style={styles.commentTime}>{getTimeAgo(reply.datetime)}</Text>
                </View>
              </View>
              <Text style={styles.commentContent}>{reply.content}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setIsMenuVisible(true)}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="medium" color="#fff" />
              <Text style={styles.loadingText}>Please wait...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Error: {error}</Text>
            </View>
          ) : !post ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>No post data available</Text>
            </View>
          ) : (
            <>
              <View style={styles.postContainer}>
                <View style={styles.postHeader}>
                  <TouchableOpacity
                    onPress={() => router.push({
                      pathname: '/publicprofile',
                      params: { userId: post.user.userId || post.user.id }
                    })}
                    style={styles.userImageTouchable}
                  >
                    <ExpoImage
                      source={{ uri: post.user.imageUrl }}
                      style={styles.userImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  </TouchableOpacity>
                  <View style={styles.postHeaderText}>
                    <Text style={styles.userName}>{post.user.userName}</Text>
                    <View style={styles.dateLocationContainer}>
                      <Text style={styles.dateText}>{formatDate(post.datetime)}, </Text>
                      <Text style={styles.location}>{post.location}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postContent}>{post.content}</Text>

                {post.images && post.images.length > 0 ? (
                  <ScrollView
                    horizontal
                    style={styles.imageScrollView}
                    showsHorizontalScrollIndicator={false}
                  >
                    {post.images.map((imageUrl, index) => (
                      <ExpoImage
                        key={index}
                        source={{ uri: imageUrl }}
                        style={styles.postImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                        onError={(e) => console.error('Image load error:', e?.error)}
                      />
                    ))}
                  </ScrollView>
                ) : null}

                <TouchableOpacity style={[
                  styles.topicButton,
                  !post.images?.length && styles.topicButtonNoImages
                ]}>
                  <Text style={styles.topicText}>
                    {post.topic.charAt(0).toUpperCase() + post.topic.slice(1)}
                  </Text>
                </TouchableOpacity>

                <View style={styles.postActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, isLikingPost && { opacity: 0.6 }]}
                    onPress={handleLike}
                    disabled={isLikingPost}
                  >
                    <Ionicons name={post.isLiked ? "thumbs-up" : "thumbs-up-outline"} size={20} color="#fff" />
                    <Text style={styles.actionText}>{post.numberOfLikes}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={handleCommentIconPress}>
                    <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                    <Text style={styles.actionText}>
                      {post.comments?.reduce((total, comment) =>
                        total + 1 + (comment.replies?.length || 0), 0) || 0}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.timeAgo}>{getTimeAgo(post.datetime)}</Text>
                </View>
              </View>

              <View style={styles.commentsDivider} />

              <View style={styles.postContainer}>
                <View style={styles.commentsSection}>
                  {post.comments && post.comments.length > 0 ? (
                    <>
                      <Text style={styles.commentsSectionTitle}>Comments</Text>
                      {post.comments.map(comment => renderComment(comment))}
                    </>
                  ) : (
                    <View style={styles.noCommentsContainer}>
                      <Text style={styles.noCommentsText}>
                        There are no comments yet.{'\n'}
                        Feel free to leave a comment!
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.commentInputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={commentInputRef}
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor="#666"
              value={comment}
              onChangeText={setComment}
              multiline
            />
            <TouchableOpacity
              style={[styles.postButton, (!comment.trim() || isSubmittingComment) && styles.postButtonDisabled]}
              onPress={handleComment}
              disabled={!comment.trim() || isSubmittingComment}
            >
              <Text style={styles.postButtonText}>{isSubmittingComment ? 'Posting...' : 'Post'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <MenuModal
          isVisible={isMenuVisible}
          onClose={() => setIsMenuVisible(false)}
          onOptionSelect={(option) => {
            console.log('Selected option:', option);
            console.log('Current user check when selecting option:', {
              currentUserId,
              postUserId: post?.user?.userId,
              isMatch: currentUserId === post?.user?.userId
            });

            setIsMenuVisible(false);
            if (option === 'Delete') {
              console.log('Opening delete confirmation modal');
              setIsDeleteModalVisible(true);
            } else if (option === 'Edit') {
              console.log('Navigating to edit post');
              handleEditPost();
            } else if (option === 'Report post') {
              openReport({
                targetType: REPORT_TARGET_TYPES.POST,
                targetId: id,
                title: 'Report post',
              });
            } else if (option === 'Block user') {
              setIsBlockModalVisible(true);
            }
          }}
        />

        <ConfirmationModal
          visible={isDeleteModalVisible}
          title="Delete Post"
          message="Are you sure you want to delete this post?"
          onConfirm={handleDeletePost}
          onCancel={() => setIsDeleteModalVisible(false)}
          confirmText="Delete"
          cancelText="Cancel"
        />

        <ReportModal
          visible={!!reportTarget}
          onClose={() => setReportTarget(null)}
          targetType={reportTarget?.targetType}
          targetId={reportTarget?.targetId}
          title={reportTarget?.title || 'Report'}
        />

        <ConfirmationModal
          visible={isBlockModalVisible}
          title={`Block ${post?.user?.userName || 'this user'}?`}
          message={"They will no longer be able to see your activity, and their posts and comments will disappear from your feed. Our moderation team is also notified."}
          onConfirm={handleBlockAuthor}
          onCancel={() => !isBlocking && setIsBlockModalVisible(false)}
          confirmText={isBlocking ? 'Blocking...' : 'Block'}
          cancelText="Cancel"
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 24,
  },
  content: {
    flex: 1,
    marginTop: -10,
  },
  postContainer: {
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userImageTouchable: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  postHeaderText: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: '#d9d9d9',
    fontSize: 12,
  },
  location: {
    color: '#d9d9d9',
    fontSize: 12,
  },
  postTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 13,
  },
  postContent: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: "left",
    lineHeight: 24,
    marginBottom: 16,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  topicButton: {
    backgroundColor: '#25282d',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignSelf: 'flex-start',
    marginTop: 12,
    marginBottom: 5,
  },
  topicButtonNoImages: {
    marginTop: 0,
  },
  topicText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  commentsSection: {
    marginTop: 6,
  },
  commentsSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
  },
  commentContainer: {
    marginBottom: 16,
    paddingBottom: 16,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUserImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  commentUserImageTouchable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  commentHeaderText: {
    flex: 1,
  },
  commentUserName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  commentTime: {
    color: '#888',
    fontSize: 10,
  },
  commentContent: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    padding: 16,
  },
  debugText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    padding: 16,
  },
  timeAgo: {
    color: '#888',
    marginLeft: 'auto',
    fontSize: 10,
  },
  commentsDivider: {
    height: 8,
    backgroundColor: '#333',
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 50
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  commentInputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    padding: 8,
    paddingBottom: 3,
    backgroundColor: '#000',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
  },
  postButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 16,
  },
  postButtonDisabled: {
    backgroundColor: '#333',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  repliesContainer: {
    marginLeft: 20,
    marginTop: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#333',
    paddingLeft: 12,
  },
  replyContainer: {
    marginBottom: 8,
  },
  noCommentsContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },

  noCommentsText: {
    fontSize: 12,
    color: "#979797",
    textAlign: "center",
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#202020',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  resetButton: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuButton: {
    padding: 8,
  },
  imageScrollView: {
    marginVertical: 10,
  },
  postImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginRight: 10,
  },
  confirmButton: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 16,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalScrollView: {
    maxHeight: 200,
  },
});

export default PostContent;
