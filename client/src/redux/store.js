import { configureStore } from '@reduxjs/toolkit';
import { productsApi } from './productsApi';
import { chatApi } from '../features/chat/chatApi';

/**
 * Redux store — minimal setup for Phase 1/2 frontend.
 * Expanded with authSlice, cartSlice, transactionSlice as those phases land.
 */
export const store = configureStore({
  reducer: {
    [productsApi.reducerPath]: productsApi.reducer,
    [chatApi.reducerPath]: chatApi.reducer,
  },
  middleware: (getDefault) =>
    getDefault()
      .concat(productsApi.middleware)
      .concat(chatApi.middleware),
});
