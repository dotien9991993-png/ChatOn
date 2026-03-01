import axios from 'axios';
import { supabase } from '../lib/supabase';

/**
 * Axios instance — gọi API backend
 */
const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api',
  timeout: 10000,
});

// Auth interceptor — attach JWT token to all requests
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// === Conversations ===

export function getConversations() {
  return api.get('/conversations').then((res) => res.data);
}

export function getConversation(id) {
  return api.get(`/conversations/${id}`).then((res) => res.data);
}

export function sendMessage(conversationId, text) {
  return api.post('/messages/send', { conversationId, text }).then((res) => res.data);
}

export function markAsRead(conversationId) {
  return api.put(`/conversations/${conversationId}/read`).then((res) => res.data);
}

export function updateConversation(id, data) {
  return api.put(`/conversations/${id}`, data).then((res) => res.data);
}

// === Settings ===

export function getSettings() {
  return api.get('/settings').then((res) => res.data);
}

export function updateChannel(channel, data) {
  return api.put(`/settings/channels/${channel}`, data).then((res) => res.data);
}

export function testChannel(channel) {
  return api.post(`/settings/channels/${channel}/test`).then((res) => res.data);
}

export function disconnectChannel(channel) {
  return api.delete(`/settings/channels/${channel}`).then((res) => res.data);
}

export function updateAISettings(data) {
  return api.put('/settings/ai', data).then((res) => res.data);
}

export function testAI() {
  return api.post('/settings/ai/test').then((res) => res.data);
}

export function updateOMSSettings(data) {
  return api.put('/settings/oms', data).then((res) => res.data);
}

export function testOMS() {
  return api.post('/settings/oms/test').then((res) => res.data);
}

export function updateShopSettings(data) {
  return api.put('/settings/shop', data).then((res) => res.data);
}

export function updateAccountSettings(data) {
  return api.put('/settings/account', data).then((res) => res.data);
}

export function getProducts() {
  return api.get('/settings/products').then((res) => res.data);
}

export function uploadProducts(products) {
  return api.post('/settings/products/upload', { products }).then((res) => res.data);
}

// === Products ===

export function getProductsList(params = {}) {
  return api.get('/products', { params }).then((res) => res.data);
}

export function searchProductsQuick(q) {
  return api.get('/products/search', { params: { q } }).then((res) => res.data);
}

export function getProductCategories() {
  return api.get('/products/categories').then((res) => res.data);
}

export function createProduct(data) {
  return api.post('/products', data).then((res) => res.data);
}

export function updateProduct(id, data) {
  return api.put(`/products/${id}`, data).then((res) => res.data);
}

export function deleteProduct(id) {
  return api.delete(`/products/${id}`).then((res) => res.data);
}

export function importProducts(products) {
  return api.post('/products/import', { products }).then((res) => res.data);
}

// === Orders ===

export function getOrders(params = {}) {
  return api.get('/orders', { params }).then((res) => res.data);
}

export function getOrder(id) {
  return api.get(`/orders/${id}`).then((res) => res.data);
}

export function createOrderFromChat(data) {
  return api.post('/orders', data).then((res) => res.data);
}

export function retryOrderPush(id) {
  return api.post(`/orders/${id}/retry-push`).then((res) => res.data);
}

export function cancelOrder(id) {
  return api.post(`/orders/${id}/cancel`).then((res) => res.data);
}

// === Quick Replies ===

export function getQuickReplies() {
  return api.get('/settings/quick-replies').then((res) => res.data);
}

export function updateQuickReplies(quick_replies) {
  return api.put('/settings/quick-replies', { quick_replies }).then((res) => res.data);
}

// === Customers ===

export function getCustomers(params = {}) {
  return api.get('/customers', { params }).then((res) => res.data);
}

export function getCustomerTags() {
  return api.get('/customers/tags').then((res) => res.data);
}

export function getCustomer(id) {
  return api.get(`/customers/${id}`).then((res) => res.data);
}

export function updateCustomer(id, data) {
  return api.put(`/customers/${id}`, data).then((res) => res.data);
}

export function bulkTagCustomers(data) {
  return api.post('/customers/bulk-tag', data).then((res) => res.data);
}

export function mergeCustomers(data) {
  return api.post('/customers/merge', data).then((res) => res.data);
}

export function exportCustomersCsv() {
  return api.get('/customers/export/csv', { responseType: 'text' }).then((res) => res.data);
}

// === Dashboard ===

export function getDashboardStats() {
  return api.get('/dashboard/stats').then((res) => res.data);
}

export function getDashboardCharts(days = 7) {
  return api.get('/dashboard/charts', { params: { days } }).then((res) => res.data);
}

export function getDashboardAgents() {
  return api.get('/dashboard/agents').then((res) => res.data);
}

// === Team ===

export function getTeamMembers() {
  return api.get('/team').then((res) => res.data);
}

export function inviteTeamMember(data) {
  return api.post('/team/invite', data).then((res) => res.data);
}

export function changeTeamRole(memberId, role) {
  return api.put(`/team/${memberId}/role`, { role }).then((res) => res.data);
}

export function removeTeamMember(memberId) {
  return api.delete(`/team/${memberId}`).then((res) => res.data);
}

export function assignConversation(conversationId, agentId) {
  return api.post('/team/assign', { conversationId, agentId }).then((res) => res.data);
}

// === Comments ===

export function getComments(params = {}) {
  return api.get('/comments', { params }).then((res) => res.data);
}

export function getCommentPosts() {
  return api.get('/comments/posts').then((res) => res.data);
}

export function replyComment(commentId, message) {
  return api.post(`/comments/${commentId}/reply`, { message }).then((res) => res.data);
}

export function hideComment(commentId) {
  return api.post(`/comments/${commentId}/hide`).then((res) => res.data);
}

export function unhideComment(commentId) {
  return api.post(`/comments/${commentId}/unhide`).then((res) => res.data);
}

export function privateReplyComment(commentId, message) {
  return api.post(`/comments/${commentId}/private-reply`, { message }).then((res) => res.data);
}

export function syncComments(post_id) {
  return api.post('/comments/sync', { post_id }).then((res) => res.data);
}

export function getCommentSettings() {
  return api.get('/settings/comments').then((res) => res.data);
}

export function updateCommentSettings(data) {
  return api.put('/settings/comments', data).then((res) => res.data);
}

// === Campaigns ===

export function getCampaigns(params = {}) {
  return api.get('/campaigns', { params }).then((res) => res.data);
}

export function getCampaign(id) {
  return api.get(`/campaigns/${id}`).then((res) => res.data);
}

export function createCampaign(data) {
  return api.post('/campaigns', data).then((res) => res.data);
}

export function updateCampaign(id, data) {
  return api.put(`/campaigns/${id}`, data).then((res) => res.data);
}

export function sendCampaign(id) {
  return api.post(`/campaigns/${id}/send`).then((res) => res.data);
}

export function scheduleCampaign(id, scheduled_at) {
  return api.post(`/campaigns/${id}/schedule`, { scheduled_at }).then((res) => res.data);
}

export function cancelCampaign(id) {
  return api.post(`/campaigns/${id}/cancel`).then((res) => res.data);
}

export function previewCampaign(id) {
  return api.get(`/campaigns/${id}/preview`).then((res) => res.data);
}

// === Livestream ===

export function getLivestreams() {
  return api.get('/livestream').then((res) => res.data);
}

export function getLivestreamDetail(id) {
  return api.get(`/livestream/${id}`).then((res) => res.data);
}

export function startLivestream(data) {
  return api.post('/livestream/start', data).then((res) => res.data);
}

export function stopLivestream(id) {
  return api.post(`/livestream/${id}/stop`).then((res) => res.data);
}

export function getLivestreamComments(id, after) {
  const params = {};
  if (after) params.after = after;
  return api.get(`/livestream/${id}/comments`, { params }).then((res) => res.data);
}

// === Facebook OAuth ===

const authApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 10000,
});

// Also attach auth token to authApi
authApi.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export function getFacebookOAuthUrl() {
  return api.get('/facebook/connect').then((res) => res.data);
}

export function getFacebookPages() {
  return api.get('/facebook/pages').then((res) => res.data);
}

export function connectFacebookPage(pageData) {
  return api.post('/facebook/pages/connect', pageData).then((res) => res.data);
}

export function disconnectFacebookPage() {
  return api.post('/facebook/pages/disconnect').then((res) => res.data);
}

export function getFacebookTokenStatus() {
  return api.get('/facebook/token-status').then((res) => res.data);
}

export default api;
