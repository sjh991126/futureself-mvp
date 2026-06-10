import api, { TokenManager } from '../config';

const API_URL = `/api/community/v1/posts`;

export const getPosts = async ({ page = 0, pageSize = 10 }) => {
  try {
    const response = await api.get(API_URL, {
      params: {
        page,
        size: pageSize
      },
      timeout: 10000, // 10초 타임아웃 설정
    });

    console.log('API Response:', response.data);

    // Add detailed logging for the first post
    if (response.data.content && response.data.content.length > 0) {
      const firstPost = response.data.content[0];
      console.log('API Response - First Post Details:', {
        id: firstPost.id,
        commentProperties: {
          numberOfComments: firstPost.numberOfComments,
          totalComments: firstPost.totalComments,
          commentCount: firstPost.commentCount,
          comments: firstPost.comments?.length,
          // Log all properties that might contain comment information
          allPossibleCommentProps: Object.keys(firstPost).filter(key =>
            key.toLowerCase().includes('comment')
          ).reduce((obj, key) => {
            obj[key] = firstPost[key];
            return obj;
          }, {})
        }
      });
    }

    // Log the mapped post object to see what's actually being stored
    const mappedPosts = response.data.content.map(post => {
      const resolvedLikeCount =
        typeof post.numberOfLikes === 'number' ? post.numberOfLikes
          : (typeof post.totalLikes === 'number' ? post.totalLikes
            : (typeof post.likeCount === 'number' ? post.likeCount : 0));
      const resolvedIsLiked =
        typeof post.isLiked === 'boolean' ? post.isLiked
          : (typeof post.liked === 'boolean' ? post.liked : false);

      const resolvedCommentCount =
        typeof post.numberOfComments === 'number' ? post.numberOfComments
          : (typeof post.totalComments === 'number' ? post.totalComments
            : (typeof post.commentCount === 'number' ? post.commentCount
              : ((post.comments?.length || 0) +
                (post.comments?.reduce((total, comment) => total + (comment.replies?.length || 0), 0) || 0))));

      const mappedPost = {
        id: post.id.toString(),
        userId: post.user.id,
        userName: post.user.userName,
        userImage: post.user.imageUrl,
        location: post.location || '',
        title: post.title || '',
        content: post.content || '',
        topic: post.topic || 'General',
        numberOfLikes: resolvedLikeCount,
        isLiked: resolvedIsLiked,
        numberOfComments: resolvedCommentCount,
        datetime: post.datetime,
        images: post.images || [],
      };

      // Log the first mapped post
      if (post.id === response.data.content[0].id) {
        console.log('Mapped Post Object:', {
          id: mappedPost.id,
          numberOfComments: mappedPost.numberOfComments,
          originalCommentData: {
            numberOfComments: post.numberOfComments,
            totalComments: post.totalComments
          }
        });
      }

      return mappedPost;
    });

    return {
      posts: mappedPosts.sort((a, b) => new Date(b.datetime) - new Date(a.datetime)),
      pagination: {
        currentPage: response.data.pageable?.pageNumber || 0,
        totalPages: response.data.totalPages || 1,
        hasMore: !response.data.last
      }
    };
  } catch (error) {
    console.error('API Error:', error);
    if (error.response?.status === 401) {
      await TokenManager.refreshToken();
    }
    throw error;
  }
};
