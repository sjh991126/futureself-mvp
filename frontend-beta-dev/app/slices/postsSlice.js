import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getPosts } from '../src/api/getPosts';
import { likePost } from '../src/api/likePost';

// Async thunk for fetching posts
export const fetchPosts = createAsyncThunk(
  'posts/fetchPosts',
  async () => {
    // Load all posts with a large pageSize
    const response = await getPosts({ page: 0, pageSize: 1000 });
    return {
      posts: response.posts.sort((a, b) => new Date(b.datetime) - new Date(a.datetime)), // Sort by datetime
      pagination: response.pagination
    };
  }
);

// Async thunk for handling likes
export const toggleLikePost = createAsyncThunk(
  'posts/toggleLike',
  async (postId) => {
    const result = await likePost(postId);
    return { postId, ...result };
  },
  {
    condition: (postId, { getState }) => {
      const normalizedPostId = String(postId);
      const { posts } = getState();
      return !posts.likingPostIds[normalizedPostId];
    }
  }
);

const postsSlice = createSlice({
  name: 'posts',
  initialState: {
    posts: [],
    isLoading: false,
    error: null,
    selectedTopics: [],
    selectedMonths: [],
    searchQuery: '',
    selectedRegions: [],
    lastFetched: null, // Add timestamp for cache management
    likingPostIds: {},
  },
  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setSelectedTopics: (state, action) => {
      state.selectedTopics = action.payload;
    },
    setSelectedMonths: (state, action) => {
      state.selectedMonths = action.payload;
    },
    setSelectedRegions: (state, action) => {
      state.selectedRegions = action.payload;
    },
    resetFilters: (state) => {
      state.selectedTopics = [];
      state.selectedMonths = [];
      state.selectedRegions = [];
      state.searchQuery = '';
    },
    // Optimistic local removal of every post authored by a user we just blocked.
    // The next fetchPosts call will reconcile with the server (which also filters
    // blocked users), but this gives the UI an instant response which Apple
    // explicitly looks for in the App Review screen recording.
    removePostsByUser: (state, action) => {
      const blockedUserId = String(action.payload);
      if (!blockedUserId) return;
      state.posts = state.posts.filter((post) => {
        const authorId = String(post.userId ?? post.user?.id ?? post.user?.userId ?? '');
        return authorId !== blockedUserId;
      });
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchPosts
      .addCase(fetchPosts.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.posts = action.payload.posts;
        state.isLoading = false;
        state.lastFetched = Date.now(); // Store fetch timestamp
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      })
      // Handle toggleLikePost
      .addCase(toggleLikePost.fulfilled, (state, action) => {
        const postId = String(action.payload.postId);
        delete state.likingPostIds[postId];
        state.posts = state.posts.map(post => {
          if (String(post.id) === postId) {
            const nextIsLiked =
              typeof action.payload.liked === 'boolean'
                ? action.payload.liked
                : !post.isLiked;
            const nextNumberOfLikes =
              typeof action.payload.totalLikes === 'number'
                ? action.payload.totalLikes
                : (post.isLiked ? post.numberOfLikes - 1 : post.numberOfLikes + 1);

            return {
              ...post,
              isLiked: nextIsLiked,
              numberOfLikes: nextNumberOfLikes
            };
          }
          return post;
        });
      })
      .addCase(toggleLikePost.pending, (state, action) => {
        const postId = String(action.meta.arg);
        state.likingPostIds[postId] = true;
      })
      .addCase(toggleLikePost.rejected, (state, action) => {
        const postId = String(action.meta.arg);
        delete state.likingPostIds[postId];
      });
  },
});

// Export actions
export const {
  setSearchQuery,
  setSelectedTopics,
  setSelectedMonths,
  setSelectedRegions,
  resetFilters,
  removePostsByUser,
} = postsSlice.actions;

// Export selectors
export const selectFilteredPosts = (state) => {
  const { posts, selectedTopics, selectedMonths, selectedRegions, searchQuery } = state.posts;
  
  return posts.filter(post => {
    // Topic filter
    const topicMatch = selectedTopics.length === 0 || 
      selectedTopics.includes(post.topic?.toLowerCase().replace(/s$/, ''));

    // Month filter
    const postMonth = new Date(post.datetime).toLocaleString('en-US', { month: 'short' });
    const monthMatch = selectedMonths.length === 0 || selectedMonths.includes(postMonth);

    // Search filter
    const searchMatch = !searchQuery || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());

    // Region filter
    const regionMatch = selectedRegions.length === 0 || 
      selectedRegions.includes(post.region);

    return topicMatch && monthMatch && searchMatch && regionMatch;
  });
};

export default postsSlice.reducer;
