import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, Stack } from 'expo-router';
import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reviewsService } from '../../services/reviews.service';
import { useNotification } from '../../context/NotificationContext';
import { Review } from '../../types';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../../theme';

export default function UserReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { showAlert, showConfirm, showToast } = useNotification();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit review state
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await reviewsService.getUserReviews(user.id);
      setReviews(data);
    } catch (err) {
      console.error('Failed to fetch user reviews:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const handleDelete = (review: Review) => {
    showConfirm(
      'Delete Review',
      'Are you sure you want to delete this review?',
      async () => {
        try {
          await reviewsService.deleteReview(review.id);
          setReviews((prev) => prev.filter((r) => r.id !== review.id));
          showToast('Review Deleted', 'Your review has been successfully removed.');
        } catch {
          showAlert('Error', 'Could not delete review. Please try again.');
        }
      },
      'Delete',
      'Cancel',
      true
    );
  };

  const openEditModal = (review: Review) => {
    setEditingReview(review);
    setEditRating(review.rating || 5);
    setEditText(review.text || '');
  };

  const handleSaveEdit = async () => {
    if (!editingReview) return;
    if (!editText.trim()) {
      showAlert('Review Required', 'Please enter your review text.');
      return;
    }

    setSavingEdit(true);
    try {
      await reviewsService.updateReview(editingReview.id, {
        product_id: editingReview.product_id,
        rating: editRating,
        text: editText.trim(),
      });
      setReviews((prev) =>
        prev.map((r) =>
          r.id === editingReview.id
            ? { ...r, rating: editRating, text: editText.trim() }
            : r
        )
      );
      setEditingReview(null);
      showToast('Review Updated', 'Your review has been updated successfully.');
    } catch {
      showAlert('Error', 'Failed to update review. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0';

  const renderItem = ({ item }: { item: Review }) => {
    return (
      <View style={styles.card}>
        {/* Product header info */}
        <TouchableOpacity
          style={styles.productHeader}
          activeOpacity={0.85}
          onPress={() => router.push(`/product/${item.product_id}`)}
        >
          {item.products?.image_url ? (
            <Image
              source={{ uri: item.products.image_url }}
              style={styles.productImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.productPlaceholder}>
              <MaterialCommunityIcons name="pill" size={24} color={colors.primary} />
            </View>
          )}

          <View style={styles.productDetails}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {item.products?.title || `Product #${item.product_id}`}
            </Text>
            {item.products?.price ? (
              <Text style={styles.productPrice}>
                ₹{Number(item.products.price).toLocaleString()}
              </Text>
            ) : null}
          </View>

          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Rating and date row */}
        <View style={styles.ratingRow}>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <MaterialCommunityIcons
                key={star}
                name={star <= item.rating ? 'star' : 'star-outline'}
                size={18}
                color={star <= item.rating ? colors.accent : colors.border}
              />
            ))}
          </View>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </View>

        {/* Review body */}
        <View style={styles.reviewBody}>
          <Text style={styles.reviewText}>{item.text}</Text>
        </View>

        {/* Action row (Edit / Delete) */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openEditModal(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.primary} />
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.error} />
            <Text style={[styles.actionBtnText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 12) + spacing.xs }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerIconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Summary stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Reviews</Text>
          <Text style={styles.summaryValue}>{reviews.length}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Avg Rating Given</Text>
          <View style={styles.ratingValueRow}>
            <MaterialCommunityIcons name="star" size={20} color={colors.accent} />
            <Text style={styles.summaryValue}>{avgRating}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your reviews...</Text>
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="star-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Reviews Yet</Text>
          <Text style={styles.emptySubtitle}>
            You haven't written any product reviews yet. Share your feedback on healthcare products you've purchased!
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.88}
          >
            <Text style={styles.browseBtnText}>Explore Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 20) + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {/* Edit Review Modal */}
      <Modal
        visible={!!editingReview}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingReview(null)}
      >
        <TouchableWithoutFeedback onPress={() => setEditingReview(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Review</Text>
                  <TouchableOpacity
                    onPress={() => setEditingReview(null)}
                    style={styles.closeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Rating selection */}
                <Text style={styles.ratingPrompt}>Rate this product</Text>
                <View style={styles.starRatingPicker}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setEditRating(star)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <MaterialCommunityIcons
                        name={star <= editRating ? 'star' : 'star-outline'}
                        size={32}
                        color={star <= editRating ? colors.accent : colors.border}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Review text input */}
                <TextInput
                  style={styles.textInput}
                  multiline
                  numberOfLines={4}
                  placeholder="Share your honest feedback..."
                  placeholderTextColor={colors.textTertiary}
                  value={editText}
                  onChangeText={setEditText}
                />

                {/* Save button */}
                <TouchableOpacity
                  style={[styles.saveBtn, savingEdit && styles.btnDisabled]}
                  onPress={handleSaveEdit}
                  disabled={savingEdit}
                  activeOpacity={0.88}
                >
                  {savingEdit ? (
                    <ActivityIndicator color={colors.surface} />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: fonts.headingBold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontFamily: fonts.headingBold,
    color: colors.primary,
  },
  ratingValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceAlt,
    marginBottom: spacing.sm,
  },
  productImage: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  productPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  productDetails: {
    flex: 1,
    marginRight: spacing.xs,
  },
  productTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.headingBold,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bodyBold,
    color: colors.primary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  dateText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  reviewBody: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  reviewText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionBtnText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bodyBold,
    color: colors.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fonts.headingBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  browseBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  browseBtnText: {
    color: colors.textInverse,
    fontFamily: fonts.headingBold,
    fontSize: fontSize.sm,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 30, 24, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.md + 1,
    fontFamily: fonts.headingBold,
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  ratingPrompt: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  starRatingPicker: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  textInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSize.sm,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: colors.textInverse,
    fontFamily: fonts.headingBold,
    fontSize: fontSize.sm,
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
