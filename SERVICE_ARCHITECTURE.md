# Service Layer Architecture Documentation

## การแยก Service Layer และ Repository Layer

### 📋 Overview
ได้ทำการแยก **Service Layer** และ **Repository Layer** ออกจาก Controller เพื่อให้โครงสร้างโค้ดมีความชัดเจนและแยกหน้าที่ความรับผิดชอบให้เหมาะสม

### 🏗 Architecture Pattern

```
Controllers → Services → Repositories → Models (Database)
```

- **Controllers**: จัดการ HTTP requests/responses และ validation
- **Services**: จัดการ business logic และ orchestration
- **Repositories**: จัดการการติดต่อกับ database โดยตรง
- **Models**: ข้อมูลและ schema ของ database

### 📁 โครงสร้างไฟล์

```
src/
├── controllers/
│   ├── auth/
│   │   ├── index.ts      # Auth controllers
│   │   └── helper.ts     # Auth helpers
│   └── posts/
│       ├── index.ts      # Post controllers
│       └── helper.ts     # Post helpers
├── services/             # 🆕 Business Logic Layer
│   ├── AuthService.ts    # Authentication business logic
│   ├── PostService.ts    # Post business logic
│   ├── FacebookService.ts # Facebook integration logic
│   ├── otpService.ts     # OTP service (existing)
│   └── index.ts          # Service exports
├── repositories/         # 🆕 Data Access Layer
│   ├── UserRepository.ts # User database operations
│   ├── PostRepository.ts # Post database operations
│   └── index.ts          # Repository exports
└── models/
    ├── User.ts           # User model/schema
    └── Post.ts           # Post model/schema
```

## 🔧 Service Layer Implementation

### AuthService
**ไฟล์**: `src/services/AuthService.ts`

**หน้าที่**:
- จัดการ authentication logic
- การ register/login ด้วย email/phone
- Facebook authentication
- JWT token management
- Password validation

**เมธอดหลัก**:
```typescript
- register(data: RegisterData): Promise<{ user: IUser }>
- login(data: LoginData): Promise<AuthResult>
- facebookLogin(facebookData): Promise<AuthResult>
- refreshToken(refreshToken: string): Promise<{ accessToken, refreshToken }>
- logout(userId: string): Promise<void>
- changePassword(): Promise<void>
- getProfile(): Promise<IUser>
- updateProfile(): Promise<IUser>
```

### PostService
**ไฟล์**: `src/services/PostService.ts`

**หน้าที่**:
- จัดการ business logic ของ posts
- การสร้าง/อัปเดต/ลบโพสต์
- การค้นหาและ filtering
- Permission checking

**เมธอดหลัก**:
```typescript
- createPost(data: CreatePostData): Promise<IPost>
- getAllPosts(page, limit, filter): Promise<{ posts, pagination }>
- getPostById(id: string): Promise<IPost>
- updatePost(): Promise<IPost>
- deletePost(): Promise<void>
- approvePost(): Promise<IPost>
- searchPosts(): Promise<{ posts, pagination }>
```

### FacebookService
**ไฟล์**: `src/services/FacebookService.ts`

**หน้าที่**:
- จัดการ Facebook Graph API
- Token verification
- User data retrieval

## 🗄 Repository Layer Implementation

### UserRepository
**ไฟล์**: `src/repositories/UserRepository.ts`

**หน้าที่**:
- จัดการการติดต่อ database สำหรับ User model
- CRUD operations
- Query และ filtering

**เมธอดหลัก**:
```typescript
- create(userData: Partial<IUser>): Promise<IUser>
- findById(id: string): Promise<IUser | null>
- findByEmail(email: string): Promise<IUser | null>
- findByPhone(phone: string): Promise<IUser | null>
- findByFacebookId(facebookId: string): Promise<IUser | null>
- update(id: string, data: Partial<IUser>): Promise<IUser | null>
- delete(id: string): Promise<boolean>
- findWithPagination(): Promise<{ users, total }>
```

### PostRepository
**ไฟล์**: `src/repositories/PostRepository.ts`

**หน้าที่**:
- จัดการการติดต่อ database สำหรับ Post model
- CRUD operations พร้อม population
- Search และ filtering

**เมธอดหลัก**:
```typescript
- create(postData: Partial<IPost>): Promise<IPost>
- findById(id: string): Promise<IPost | null>
- findByUserId(userId: string): Promise<IPost[]>
- update(id: string, data: Partial<IPost>): Promise<IPost | null>
- delete(id: string): Promise<boolean>
- findWithPagination(): Promise<{ posts, total }>
- search(query: string): Promise<IPost[]>
- findByCategory(category: string): Promise<IPost[]>
```

## 🔄 Controller Updates

### การเปลี่ยนแปลงใน Controllers

**ก่อน** (เรียก Model โดยตรง):
```typescript
// controllers/auth/index.ts
const user = await User.findOne({ email });
```

**หลัง** (ใช้ Service Layer):
```typescript
// controllers/auth/index.ts
const authService = new AuthService();
const { user, accessToken, refreshToken } = await authService.login({ identifier, password });
```

## ✅ ประโยชน์ของการแยก Layer

### 1. **Separation of Concerns**
- Controllers: จัดการ HTTP และ validation
- Services: จัดการ business logic
- Repositories: จัดการ database operations

### 2. **Testability**
- แต่ละ layer สามารถ test แยกกันได้
- Mock dependencies ได้ง่าย
- Unit testing ทำได้สะดวกขึ้น

### 3. **Maintainability**
- โค้ดมีโครงสร้างชัดเจน
- แก้ไขและขยายฟีเจอร์ได้ง่าย
- Business logic แยกออกจาก infrastructure code

### 4. **Reusability**
- Services สามารถใช้ซ้ำได้ในหลาย controllers
- Repository pattern ทำให้เปลี่ยน database ได้ง่าย

### 5. **Dependency Injection Ready**
- Interface-based design
- เตรียมพร้อมสำหรับการใช้ DI container

## 🚀 การใช้งาน

### Import Services
```typescript
import { AuthService, PostService } from '@/services'

const authService = new AuthService()
const postService = new PostService()
```

### Import Repositories
```typescript
import { UserRepository, PostRepository } from '@/repositories'

const userRepo = new UserRepository()
const postRepo = new PostRepository()
```

## 📊 การ Build และ Test

### Build Status: ✅ สำเร็จ
```bash
pnpm build  # No TypeScript errors
```

### การ Test
```bash
pnpm test   # Run unit tests
pnpm test:watch  # Watch mode for development
```

## 🎯 Next Steps

1. **เพิ่ม Unit Tests** สำหรับ Services และ Repositories
2. **Implement Dependency Injection** Container
3. **เพิ่ม Logging** และ Monitoring
4. **Cache Layer** สำหรับ performance optimization
5. **API Documentation** อัปเดตตาม architecture ใหม่

---

**✨ Summary**: ได้แยก Service Layer และ Repository Layer สำเร็จแล้ว ทำให้โครงสร้างโค้ดมีความชัดเจน แยกหน้าที่ความรับผิดชอบ และง่ายต่อการบำรุงรักษา!