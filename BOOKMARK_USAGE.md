# Bookmark & View Tracking API Usage Examples

## 🔖 Bookmark Functions

### 1. Add Bookmark
```bash
POST /api/bookmarks/64a1b2c3d4e5f6789012345
Authorization: Bearer <user_token>

# Response:
{
  "success": true,
  "message": "Bookmark added successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6789012346",
    "userId": "64a1b2c3d4e5f6789012340",
    "postId": "64a1b2c3d4e5f6789012345",
    "createdAt": "2023-07-03T10:30:00.000Z"
  }
}
```

### 2. Remove Bookmark
```bash
DELETE /api/bookmarks/64a1b2c3d4e5f6789012345
Authorization: Bearer <user_token>

# Response:
{
  "success": true,
  "message": "Bookmark removed successfully",
  "data": null
}
```

### 3. Toggle Bookmark
```bash
PUT /api/bookmarks/64a1b2c3d4e5f6789012345/toggle
Authorization: Bearer <user_token>

# Response:
{
  "success": true,
  "message": "Bookmark added successfully",
  "data": {
    "action": "added",
    "bookmark": { ... }
  }
}
```

### 4. Check Bookmark Status
```bash
GET /api/bookmarks/64a1b2c3d4e5f6789012345/status
Authorization: Bearer <user_token>

# Response:
{
  "success": true,
  "message": "Bookmark status retrieved",
  "data": {
    "isBookmarked": true
  }
}
```

### 5. Get User Bookmarks
```bash
GET /api/bookmarks?page=1&limit=20&propertyType=land&province=วียงจันทน์
Authorization: Bearer <user_token>

# Response:
{
  "success": true,
  "message": "User bookmarks retrieved successfully",
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012346",
      "createdAt": "2023-07-03T10:30:00.000Z",
      "post": {
        "_id": "64a1b2c3d4e5f6789012345",
        "title": "ที่ดินเปล่า 5 ไร่ ติดถนนใหญ่",
        "price": 8000000000,
        "propertyType": "land",
        "area": 20000,
        "location": { ... },
        "viewCount": 156,
        "bookmarkCount": 23
      }
    }
  ],
  "pagination": {
    "current": 1,
    "pages": 5,
    "limit": 20,
    "total": 87
  }
}
```

### 6. Get Bookmark Count
```bash
GET /api/bookmarks/count
Authorization: Bearer <user_token>

# Response:
{
  "success": true,
  "message": "Bookmark count retrieved successfully",
  "data": {
    "count": 12
  }
}
```

## 👀 View Tracking Functions

### 1. Get Post (Auto Track View)
```bash
GET /api/posts/64a1b2c3d4e5f6789012345
# Headers:
# x-session-id: unique_session_id (for guest users)

# Response: 
{
  "success": true,
  "message": "Post retrieved successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6789012345",
    "title": "ที่ดินเปล่า 5 ไร่ ติดถนนใหญ่",
    "viewCount": 157, // Updated automatically
    "uniqueViewCount": 89,
    "bookmarkCount": 23,
    // ... other post data
  }
}
```

### 2. Manual Track View
```bash
POST /api/posts/64a1b2c3d4e5f6789012345/view
# Headers:
# x-session-id: unique_session_id

# Response:
{
  "success": true,
  "message": "View tracked successfully",
  "data": {
    "isNewView": true,
    "isUniqueView": false,
    "totalViews": 157,
    "uniqueViews": 89
  }
}
```

### 3. Get Post View Stats
```bash
GET /api/posts/64a1b2c3d4e5f6789012345/stats

# Response:
{
  "success": true,
  "message": "Post view stats retrieved successfully",
  "data": {
    "totalViews": 157,
    "uniqueViews": 89,
    "todayViews": 12,
    "weekViews": 45,
    "monthViews": 98
  }
}
```

### 4. Get User View History
```bash
GET /api/posts/user/view-history?page=1&limit=20
Authorization: Bearer <user_token>

# Response:
{
  "success": true,
  "message": "User view history retrieved successfully",
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012347",
      "viewedAt": "2023-07-03T14:25:00.000Z",
      "post": {
        "_id": "64a1b2c3d4e5f6789012345",
        "title": "ที่ดินเปล่า 5 ไร่ ติดถนนใหญ่",
        "price": 8000000000,
        // ... other post data
      }
    }
  ],
  "pagination": { ... }
}
```

### 5. Get Most Viewed Posts
```bash
GET /api/posts/most-viewed?timeFrame=week&limit=10

# Response:
{
  "success": true,
  "message": "Most viewed posts retrieved successfully",
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012345",
      "title": "ที่ดินเปล่า 5 ไร่ ติดถนนใหญ่",
      "viewCount": 1250,
      "uniqueViewCount": 687,
      "bookmarkCount": 45,
      // ... other post data
    }
  ]
}
```

### 6. Get Trending Posts
```bash
GET /api/posts/trending?limit=10

# Response:
{
  "success": true,
  "message": "Trending posts retrieved successfully",
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012348",
      "title": "บ้านใหม่ 3 ห้องนอน วิวสวยงาม",
      "viewCount": 890,
      "uniqueViewCount": 456,
      "bookmarkCount": 78,
      "featured": true,
      // ... other post data
    }
  ]
}
```

### 7. Get Recommended Posts
```bash
GET /api/posts/user/recommended?limit=10
Authorization: Bearer <user_token>

# Response:
{
  "success": true,
  "message": "Recommended posts retrieved successfully",
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012349",
      "title": "ที่ดินเกษตรกรรม 10 ไร่",
      "propertyType": "land", // Similar to user's interests
      "location": {
        "address": {
          "province": "วียงจันทน์" // Province user viewed before
        }
      },
      // ... other post data
    }
  ]
}
```

### 8. Get Most Bookmarked Posts
```bash
GET /api/bookmarks/most-bookmarked?limit=10

# Response:
{
  "success": true,
  "message": "Most bookmarked posts retrieved successfully",
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012350",
      "title": "บ้านหรู 4 ห้องนอน ใจกลางเมือง",
      "bookmarkCount": 234,
      "viewCount": 3456,
      "uniqueViewCount": 1890,
      // ... other post data
    }
  ]
}
```

## 🔧 Integration Tips

### Frontend Integration
```javascript
// 1. Auto-track views on page load
useEffect(() => {
  // Call GET /api/posts/:id automatically tracks view
  fetchPost(postId)
}, [postId])

// 2. Bookmark toggle button
const toggleBookmark = async (postId) => {
  try {
    const response = await api.put(`/api/bookmarks/${postId}/toggle`)
    setIsBookmarked(response.data.action === 'added')
  } catch (error) {
    console.error('Bookmark error:', error)
  }
}

// 3. Check bookmark status on load
useEffect(() => {
  checkBookmarkStatus(postId)
}, [postId])

const checkBookmarkStatus = async (postId) => {
  try {
    const response = await api.get(`/api/bookmarks/${postId}/status`)
    setIsBookmarked(response.data.isBookmarked)
  } catch (error) {
    console.error('Check bookmark error:', error)
  }
}
```

### Backend Features
- **Automatic view deduplication**: Same user/IP won't count multiple views in 24 hours
- **Unique view tracking**: Tracks first-time viewers separately
- **Guest user support**: Uses IP + session ID for non-logged users  
- **Performance optimized**: Async view tracking doesn't slow down API responses
- **Data cleanup**: TTL indexes automatically delete old view records
- **Analytics ready**: All data structured for reporting and charts

## 📊 Database Models Added

1. **Bookmark Model**: User bookmarks with compound indexes
2. **ViewHistory Model**: View tracking with IP/user deduplication
3. **Post Model Extended**: Added viewCount, uniqueViewCount, bookmarkCount fields

## ✨ Business Benefits

- **User Engagement**: Bookmark system increases return visits
- **Analytics Insights**: View tracking provides valuable data
- **Recommendation Engine**: User behavior data enables personalization  
- **Performance Metrics**: Track popular content and user preferences
- **SEO Benefits**: Popular content can be promoted automatically