'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import ReviewImageGrid from '@/components/ReviewImageGrid';

interface AdminReview {
  id: number;
  product_id: number;
  product_name: string;
  user_name: string;
  user_email: string;
  comment: string;
  rating: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  images?: string[] | string;
  reply_count?: number;
}

interface AdminReviewDetailResponse {
  review: AdminReview & { user_id: number };
  replies: Array<{ id: number; user_name: string; content: string; created_at: string; is_admin?: number }>;
  helpful: { helpful_count: number; not_helpful_count: number };
}

function parseImages(images: AdminReview['images']) {
  if (Array.isArray(images)) return images;
  if (typeof images !== 'string' || !images.trim()) return [];
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedReviewIds, setSelectedReviewIds] = useState<number[]>([]);
  const [detail, setDetail] = useState<AdminReviewDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupSummary, setCleanupSummary] = useState<string>('');
  const [filters, setFilters] = useState({ status: 'pending', search: '', rating: '0' });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.rating !== '0') params.set('rating', filters.rating);
    params.set('page', '1');
    params.set('limit', '20');
    return params.toString();
  }, [filters]);

  const allSelected = reviews.length > 0 && reviews.every((review) => selectedReviewIds.includes(review.id));

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/reviews?${queryString}`, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        const nextReviews = data.data?.reviews || [];
        setReviews(nextReviews);
        setSelectedReviewIds((prev) => prev.filter((id) => nextReviews.some((review: AdminReview) => review.id === id)));
      } else {
        setReviews([]);
        setSelectedReviewIds([]);
      }
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  const fetchDetail = async (reviewId: number) => {
    setDetailLoading(true);
    setSelectedId(reviewId);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setDetail(data.data);
      } else {
        setDetail(null);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const metrics = useMemo(() => {
    const pending = reviews.filter((review) => review.status === 'pending').length;
    const approved = reviews.filter((review) => review.status === 'approved').length;
    const rejected = reviews.filter((review) => review.status === 'rejected').length;
    const withImages = reviews.filter((review) => parseImages(review.images).length > 0).length;
    return { total: reviews.length, pending, approved, rejected, withImages };
  }, [reviews]);

  const updateStatus = async (reviewId: number, status: 'approved' | 'rejected' | 'pending') => {
    setActionLoading(reviewId);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.message || data.error || '审核状态更新失败');
        return;
      }
      await fetchReviews();
      if (selectedId === reviewId) {
        await fetchDetail(reviewId);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const toggleReviewSelection = (reviewId: number) => {
    setSelectedReviewIds((prev) =>
      prev.includes(reviewId) ? prev.filter((id) => id !== reviewId) : [...prev, reviewId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedReviewIds((prev) => (allSelected ? [] : reviews.map((review) => review.id)));
  };

  const updateBatchStatus = async (status: 'approved' | 'rejected') => {
    if (selectedReviewIds.length === 0) {
      alert('请先选择要批量处理的评价');
      return;
    }

    setBatchLoading(true);
    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedReviewIds, status }),
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.message || data.error || '批量审核失败');
        return;
      }
      setSelectedReviewIds([]);
      await fetchReviews();
      if (selectedId && selectedReviewIds.includes(selectedId)) {
        await fetchDetail(selectedId);
      }
    } finally {
      setBatchLoading(false);
    }
  };

  const cleanupOrphanImages = async () => {
    setCleanupLoading(true);
    try {
      const response = await fetch('/api/admin/reviews/images/cleanup', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.message || data.error || '清理孤儿图片失败');
        return;
      }
      const deletedCount = Array.isArray(data.data?.deleted) ? data.data.deleted.length : 0;
      const skippedCount = Array.isArray(data.data?.skipped) ? data.data.skipped.length : 0;
      setCleanupSummary(`本次清理删除 ${deletedCount} 张，保留 ${skippedCount} 张未到安全阈值或不可处理图片`);
    } finally {
      setCleanupLoading(false);
    }
  };

  const submitReply = async () => {
    if (!selectedId || !replyContent.trim()) {
      alert('请输入回复内容');
      return;
    }

    setActionLoading(selectedId);
    try {
      const response = await fetch(`/api/admin/reviews/${selectedId}/reply`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim() }),
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.message || data.error || '回复失败');
        return;
      }
      setReplyContent('');
      await fetchReviews();
      await fetchDetail(selectedId);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Quality Center"
        title="评价审核"
        description="集中处理商品评价审核、查看图片、后台回复与孤儿图片清理。"
        breadcrumbs={[
          { label: '后台管理', href: '/admin/dashboard' },
          { label: '质量中心' },
          { label: '评价审核' },
        ]}
        action={
          <Link href="/admin" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
            返回后台首页
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-5">
        <AdminCard className="bg-gradient-to-br from-blue-50 to-white">
          <div className="text-sm font-medium text-slate-500">评价总数</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{metrics.total}</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-medium text-slate-500">待审核</div>
          <div className="mt-3 text-3xl font-semibold text-amber-600">{metrics.pending}</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-medium text-slate-500">已通过</div>
          <div className="mt-3 text-3xl font-semibold text-emerald-700">{metrics.approved}</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-medium text-slate-500">已驳回</div>
          <div className="mt-3 text-3xl font-semibold text-red-600">{metrics.rejected}</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-medium text-slate-500">含图片评价</div>
          <div className="mt-3 text-3xl font-semibold text-blue-700">{metrics.withImages}</div>
        </AdminCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminCard
          title="评价列表"
          description="支持按状态、评分、关键词筛选，并可批量审核。"
        >
          <div className="mb-4 flex flex-wrap gap-3">
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="pending">待审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已驳回</option>
              <option value="">全部状态</option>
            </select>
            <select
              value={filters.rating}
              onChange={(event) => setFilters((prev) => ({ ...prev, rating: event.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="0">全部评分</option>
              <option value="5">5 星</option>
              <option value="4">4 星</option>
              <option value="3">3 星</option>
              <option value="2">2 星</option>
              <option value="1">1 星</option>
            </select>
            <input
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="搜索评价、用户、商品"
              className="min-w-[220px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded border-slate-300 text-blue-700 focus:ring-blue-600" />
                <span>全选当前列表</span>
              </label>
              <span>已选 {selectedReviewIds.length} 条</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={batchLoading || selectedReviewIds.length === 0}
                onClick={() => updateBatchStatus('approved')}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                批量通过
              </button>
              <button
                type="button"
                disabled={batchLoading || selectedReviewIds.length === 0}
                onClick={() => updateBatchStatus('rejected')}
                className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                批量驳回
              </button>
              <button
                type="button"
                disabled={cleanupLoading}
                onClick={cleanupOrphanImages}
                className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                清理孤儿图片
              </button>
            </div>
          </div>

          {cleanupSummary ? (
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">{cleanupSummary}</div>
          ) : null}

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">加载评价中...</div>
          ) : reviews.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">当前筛选下暂无评价</div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const images = parseImages(review.images);
                const selected = selectedId === review.id;
                const checked = selectedReviewIds.includes(review.id);
                return (
                  <div
                    key={review.id}
                    className={`rounded-2xl border p-4 transition ${selected ? 'border-blue-500 bg-blue-50/40' : 'border-slate-200 hover:border-blue-300'}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleReviewSelection(review.id)}
                          className="mt-1 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-950">{review.product_name || `商品 #${review.product_id}`}</div>
                          <div className="mt-1 text-xs text-slate-500">{review.user_name || '匿名用户'} · {review.user_email || '无邮箱'} · {new Date(review.created_at).toLocaleString('zh-CN')}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700">{review.rating} 星</span>
                        <span className={`rounded-full px-2 py-1 font-semibold ${review.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : review.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                          {review.status === 'approved' ? '已通过' : review.status === 'rejected' ? '已驳回' : '待审核'}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-700">{review.comment}</p>
                    {images.length > 0 ? <ReviewImageGrid images={images} altPrefix="后台评价图片" className="mt-3" /> : null}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>留言 {review.reply_count || 0}</span>
                        <span>评价 ID {review.id}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => fetchDetail(review.id)}
                        className="rounded-xl border border-blue-200 px-3 py-1.5 font-medium text-blue-600 hover:bg-blue-50"
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AdminCard>

        <AdminCard title="评价详情" description="支持单条审核、查看图片和后台回复。">
          {!selectedId ? (
            <div className="py-16 text-center text-sm text-slate-500">请选择一条评价查看详情</div>
          ) : detailLoading ? (
            <div className="py-16 text-center text-sm text-slate-500">正在加载详情...</div>
          ) : !detail ? (
            <div className="py-16 text-center text-sm text-slate-500">评价详情加载失败</div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-lg font-semibold text-slate-950">{detail.review.product_name || `商品 #${detail.review.product_id}`}</div>
                <div className="mt-1 text-xs text-slate-500">有帮助 {detail.helpful.helpful_count} · 没帮助 {detail.helpful.not_helpful_count}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-950">{detail.review.user_name || '匿名用户'}</div>
                <div className="mt-1 text-xs text-slate-500">评分：{detail.review.rating} 星</div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{detail.review.comment}</p>
                {parseImages(detail.review.images).length > 0 ? (
                  <ReviewImageGrid images={parseImages(detail.review.images)} altPrefix="评价详情图片" className="mt-3" />
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={actionLoading === detail.review.id}
                  onClick={() => updateStatus(detail.review.id, 'approved')}
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  审核通过
                </button>
                <button
                  type="button"
                  disabled={actionLoading === detail.review.id}
                  onClick={() => updateStatus(detail.review.id, 'rejected')}
                  className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  驳回
                </button>
                <button
                  type="button"
                  disabled={actionLoading === detail.review.id}
                  onClick={() => updateStatus(detail.review.id, 'pending')}
                  className="rounded-xl bg-slate-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  退回待审核
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-2 text-sm font-semibold text-slate-950">后台回复</div>
                <div className="space-y-2">
                  {detail.replies.length === 0 ? (
                    <div className="text-sm text-slate-500">暂无回复</div>
                  ) : (
                    detail.replies.map((reply) => (
                      <div key={reply.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-950">{reply.is_admin ? '管理员' : reply.user_name || '用户'}：</span>
                        {reply.content}
                      </div>
                    ))
                  )}
                </div>
                <textarea
                  value={replyContent}
                  onChange={(event) => setReplyContent(event.target.value)}
                  rows={3}
                  placeholder="输入管理员回复，提交后待审核评价会自动转为已通过"
                  className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <button
                  type="button"
                  disabled={actionLoading === detail.review.id}
                  onClick={submitReply}
                  className="mt-3 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  回复用户
                </button>
              </div>
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
