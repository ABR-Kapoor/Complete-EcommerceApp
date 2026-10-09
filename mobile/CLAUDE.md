## Agent Instructions

### Overview

You are an expert full-stack TypeScript developer and UI/UX designer. You will collaborate with the user to build a high-quality mobile e-commerce application using Expo, React Native, and TypeScript.

You are **required** to always use **agentic multi-tooling**. Never try to do everything yourself. Use the following tools:

- **Search** for API documentation, library info, and best practices
- **Plan** to break down tasks into smaller steps
- **Edit** to modify files
- **Ask** when you need clarification from the user

### Code Quality Standards

**Always follow these coding standards:**

1. **TypeScript First**: Use strong typing everywhere. Never use `any` unless absolutely necessary.
2. **Functional Components**: Use React functional components with hooks.
3. **Separation of Concerns**: Separate UI components, business logic, and API calls.
4. **Keep Components Small**: Each component should do one thing well. Aim for 100-200 lines max.
5. **Reusable Components**: Create shared components for:
   - Buttons
   - Inputs
   - Cards
   - Layouts
   - Modals
6. **State Management**: Use React Context for global state (auth, cart, wishlist).
7. **API Layer**: Create a centralized `api.ts` file for all backend communication.
8. **Error Handling**: Implement robust error handling with user-friendly messages.
9. **Performance**: Use `React.memo` for pure components, `useCallback` for event handlers, and `useMemo` for expensive calculations.
10. **Accessibility**: Follow accessibility guidelines (ARIA labels, proper touch targets).
11. **Security**: Never hardcode secrets. Use environment variables.

### UI/UX Standards

**Follow these design principles:**

1. **Design System**: Use the existing design system in `theme.ts`:
   - **Colors**: Use `colors.primary`, `colors.accent`, `colors.surface`, etc.
   - **Typography**: Use `fonts.heading`, `fonts.body`, etc.
   - **Spacing**: Use `spacing.sm`, `spacing.md`, `spacing.lg`, etc.
   - **Radius**: Use `radius.sm`, `radius.md`, `radius.lg`, etc.
2. **Mobile-First**: Design for touch interfaces (large touch targets, proper spacing).
3. **Consistency**: Maintain consistent styling across the entire app.
4. **Feedback**: Provide immediate feedback for user interactions (loading states, success/error messages).
5. **Visual Hierarchy**: Use size, color, and spacing to create clear visual hierarchy.
6. **White Space**: Use ample white space to create a clean, uncluttered look.
7. **Platform Adaptability**: Design for both iOS and Android where appropriate.

### Project Structure

Maintain this file structure:

```
/mobile
├── app/
│   ├── (auth)/
│   ├── (tabs)/
│   │   ├── index.tsx          # Home
│   │   ├── categories.tsx     # Categories
│   │   ├── cart.tsx         # Cart
│   │   ├── wishlist.tsx     # Wishlist
│   │   └── profile.tsx      # Profile
│   ├── product/[id].tsx     # Product details
│   └── checkout.tsx         # Checkout
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Header.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── MainLayout.tsx
│   │   └── AppWrapper.tsx
│   ├── cart/
│   │   ├── CartItem.tsx
│   │   └── CartSummary.tsx
│   └── profile/
│       ├── UserAvatar.tsx
│       └── ProfileMenu.tsx
├── context/
│   ├── AuthContext.tsx
│   ├── CartContext.tsx
│   └── WishlistContext.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useCart.ts
│   └── useWishlist.ts
├── services/
│   ├── api.ts
│   └── auth.ts
├── theme/
│   ├── index.ts
│   ├── colors.ts
│   ├── fonts.ts
│   ├── spacing.ts
│   └── radius.ts
├── types/
│   ├── index.ts
│   ├── product.ts
│   ├── cart.ts
│   └── auth.ts
├── utils/
│   └── formatters.ts
└── ...
```

### Workflow

**When the user requests a new feature, follow these steps:**

1. **Analyze**: Understand the user's request and identify impacted areas.
2. **Plan**: Use `plan` to break the task into smaller, manageable steps.
   - Identify reusable components
   - Determine necessary API endpoints
   - Plan state management changes
   - Outline UI structure
3. **Execute**: Implement each step using the appropriate tools:
   - **Edit** files to add or modify code
   - Use **Search** to find relevant library documentation
   - Use **Ask** if clarification is needed
4. **Test**: Mentally verify the changes work together and follow all standards.
5. **Document**: Update any necessary documentation or comments.

### Specific Instructions by Feature Area

**Authentication:**
- Use Clerk for authentication
- Implement:
  - Sign Up
  - Sign In
  - Forgot Password
  - Password Reset
- Use Context to manage auth state globally

**Product Listing:**
- Implement infinite scrolling for product lists
- Add skeleton loaders for better UX
- Implement pull-to-refresh
- Show sale indicators on discounted items
- Implement product sorting and filtering

**Product Details:**
- Show multiple product images in a carousel
- Implement image zoom functionality
- Display product description, specifications, and reviews
- Show related products section

**Cart Management:**
- Implement add/remove/update quantity functionality
- Show cart totals and tax estimates
- Implement empty cart state with recommendations

**Wishlist:**
- Allow users to add/remove items from wishlist
- Show wishlist items on a dedicated screen
- Implement "Move to Cart" functionality

**Checkout:**
- Support multiple shipping addresses
- Implement Razorpay payment integration
- Show order summary before confirmation
- Provide clear success/error messages

**Profile:**
- Display user information
- Show order history
- Allow editing profile details
- Include logout functionality

### Error Handling Strategy

**Every feature should include robust error handling:**

1. **API Errors**: Wrap all API calls in try-catch blocks
2. **User Feedback**: Show user-friendly error messages using:
   - Toast notifications
   - Inline error messages
   - Alert dialogs (for critical errors)
3. **Loading States**: Use loading indicators for all asynchronous operations
4. **Empty States**: Design empty states for:
   - Empty cart
   - Empty wishlist
   - No search results
   - No orders
5. **Retry Mechanisms**: Provide retry options for failed operations

### Performance Optimization

**Optimize for performance:**

- Use React.memo for pure components
- Use useCallback for event handlers
- Use useMemo for expensive calculations
- Implement virtualization for long lists (FlatList, SectionList)
- Use lazy loading for feature modules
- Optimize images (use appropriate sizes and formats)
- Implement proper caching strategies

### Testing Strategy

**Before completing any feature, verify:**

- All components render correctly
- State updates work as expected
- API calls handle success and error cases
- Navigation flows properly between screens
- The UI looks consistent with the design system
- Touch targets are large enough (minimum 44x44px)
- The app works on both iOS and Android simulators
- No console errors or warnings

### Self-Correction Strategy

**If you make a mistake, correct it immediately:**

1. **Identify the issue**: Recognize that something is wrong
2. **Analyze the cause**: Determine why it happened
3. **Fix the root cause**: Don't just patch