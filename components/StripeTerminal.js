// components/StripeTerminal.js
'use client';
import { useEffect, useMemo, useState } from 'react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';

function ServicePickerButton({ item, selectedServices, onAdd, onQuantityChange, isAddOn = false }) {
  const variations = item.variations?.length ? item.variations : [item];
  const [selectedVariationId, setSelectedVariationId] = useState(variations[0].id);
  const selectedVariation =
    variations.find((variation) => variation.id === selectedVariationId) || variations[0];
  const showVariationPills =
    variations.length > 1 ||
    (selectedVariation.variation_name &&
      selectedVariation.variation_name.toLowerCase() !== 'standard');
  const selectedQuantity =
    selectedServices.find((service) => service.id === selectedVariation.id)?.quantity || 0;
  const hasRequiredMainService =
    !isAddOn ||
    selectedServices.some(
      (service) => !service.is_add_on && service.category === item.category
    );

  return (
    <div
      role="button"
      tabIndex={hasRequiredMainService ? 0 : -1}
      onClick={() => hasRequiredMainService && onAdd(selectedVariation)}
      onKeyDown={(event) => {
        if (
          hasRequiredMainService &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault();
          onAdd(selectedVariation);
        }
      }}
      aria-disabled={!hasRequiredMainService}
      className={`relative flex min-h-[68px] w-full items-center justify-between gap-2 rounded-xl border p-3 text-left shadow-sm transition active:scale-[0.99] ${
        !hasRequiredMainService
          ? 'cursor-not-allowed border-stone-200 bg-stone-100 opacity-60'
          : selectedQuantity
            ? 'cursor-pointer border-purple-500 bg-purple-50 ring-2 ring-purple-100'
            : isAddOn
              ? 'cursor-pointer border-amber-200 bg-amber-50/70'
              : 'cursor-pointer border-stone-200 bg-white'
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] font-bold leading-snug text-stone-900">{item.name}</span>
          {showVariationPills && (
            <span className="flex flex-wrap gap-1">
              {variations.map((variation, index) => {
                const isSelected = variation.id === selectedVariation.id;
                return (
                  <button
                    key={variation.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedVariationId(variation.id);
                    }}
                    disabled={!hasRequiredMainService}
                    className={`rounded-full border px-2 py-1 text-[10px] font-bold leading-none transition ${
                      isSelected
                        ? 'border-purple-700 bg-purple-700 text-white'
                        : 'border-purple-200 bg-white text-purple-800'
                    }`}
                    aria-pressed={isSelected}
                  >
                    {variation.variation_name || `Option ${index + 1}`}
                  </button>
                );
              })}
            </span>
          )}
        </span>
        {item.description && (
          <span className="mt-0.5 line-clamp-1 block text-[11px] leading-snug text-stone-500">
            {item.description}
          </span>
        )}
        {!hasRequiredMainService && (
          <span className="mt-0.5 block text-[10px] font-semibold text-stone-500">
            Select a main service first
          </span>
        )}
      </span>
      <span className="flex-none pr-1 text-sm font-bold text-purple-800">
        ${(selectedVariation.amount / 100).toFixed(2)}
      </span>
      {selectedQuantity > 0 ? (
        <span className="absolute right-1.5 top-1.5 flex items-center overflow-hidden rounded-full bg-purple-700 text-white shadow-sm">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onQuantityChange(selectedVariation.id, selectedQuantity - 1);
            }}
            onKeyDown={(event) => event.stopPropagation()}
            className="flex h-6 w-7 items-center justify-center border-r border-purple-500 text-sm font-bold transition hover:bg-purple-800"
            aria-label={`Remove one ${item.name}`}
          >
            −
          </button>
          <span className="flex h-6 min-w-[24px] items-center justify-center px-1.5 text-[10px] font-bold" aria-label={`${selectedQuantity} selected`}>
            {selectedQuantity}
          </span>
        </span>
      ) : !hasRequiredMainService ? (
        <span
          className="absolute right-1.5 top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-stone-200 px-1.5 text-[10px] font-bold text-stone-600 shadow-sm"
          aria-label="Select a main service from this category first"
        >
          🔒
        </span>
      ) : null}
    </div>
  );
}

export default function StripeTerminal() {
  const stripe = useStripe();
  const elements = useElements();
  const manualCardConfigured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [stripeItems, setStripeItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [activeServiceCategory, setActiveServiceCategory] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [selectedCouponId, setSelectedCouponId] = useState('');
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [couponsError, setCouponsError] = useState(null);
  const [loadingStripeItems, setLoadingStripeItems] = useState(true);
  const [stripeItemsError, setStripeItemsError] = useState(null);
  const [cartPreviewShown, setCartPreviewShown] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card', 'manual_card', or 'cash'
  const [manualCardComplete, setManualCardComplete] = useState(false);
  const [manualCardError, setManualCardError] = useState('');
  const [receipt, setReceipt] = useState(null); // Store receipt data for display
  const [customerSearchQuery, setCustomerSearchQuery] = useState(''); // Email, phone, or name search
  const [selectedCustomer, setSelectedCustomer] = useState(null); // Selected customer object
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState(null);
  const [searchResults, setSearchResults] = useState([]); // Multiple results from name search
  const [redeemRewards, setRedeemRewards] = useState(false);

  // Track the active PI so we can cancel it
  const [activePaymentIntentId, setActivePaymentIntentId] = useState(null);
  const [activeReaderId, setActiveReaderId] = useState(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  // Server-driven: readers come from your backend (Stripe API)
  const [readers, setReaders] = useState([]);
  const [selectedReaderId, setSelectedReaderId] = useState('');
  const [loadingReaders, setLoadingReaders] = useState(true);
  const [readersError, setReadersError] = useState(null);

  const [includeFee, setIncludeFee] = useState(true);
  const selectedCoupon = coupons.find((coupon) => coupon.id === selectedCouponId) || null;
  const selectedCouponPayload = selectedCoupon
    ? {
        code: selectedCoupon.code || '',
        coupon_id: selectedCoupon.coupon_id || '',
        promotion_code_id: selectedCoupon.promotion_code_id || '',
        name: selectedCoupon.name || '',
        discount_type: selectedCoupon.discount_type || '',
        percent_off:
          selectedCoupon.percent_off !== null && Number.isFinite(Number(selectedCoupon.percent_off))
          ? Number(selectedCoupon.percent_off)
          : null,
        amount_off:
          selectedCoupon.amount_off !== null && Number.isFinite(Number(selectedCoupon.amount_off))
          ? Number(selectedCoupon.amount_off)
          : null,
        currency: selectedCoupon.currency || '',
        discount_display: selectedCoupon.discount_display || '',
      }
    : null;

  const normalizePhoneForStripe = (rawPhone) => {
    if (!rawPhone) return null;
    const digits = rawPhone.replace(/\D/g, '');
    if (!digits) return null;

    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (rawPhone.startsWith('00')) return `+${digits.slice(2)}`;

    // fallback: prefix plus if not present
    return digits.startsWith('+') ? digits : `+${digits}`;
  };

  const formatPhoneDisplay = (rawPhone) => {
    if (!rawPhone) return '';
    const digits = rawPhone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return rawPhone;
  };

  const serviceGroups = useMemo(() => {
    const preferredOrder = [
      'Head Spa',
      'Body Massage',
      'Body Harmony',
      'Foot Care',
      'Manicure Services',
      'Side-by-Side Services',
      'Other Services',
    ];
    const rank = new Map(preferredOrder.map((name, idx) => [name.toLowerCase(), idx]));
    const collapseVariations = (items) =>
      Object.values(
        items.reduce((products, item) => {
          const key = item.product_id || item.name;
          if (!products[key]) {
            products[key] = { ...item, variations: [] };
          }
          products[key].variations.push(item);
          return products;
        }, {})
      ).map((item) => ({
        ...item,
        variations: item.variations.sort((a, b) => a.amount - b.amount),
      }));

    const groups = stripeItems.reduce((acc, item) => {
      const category = String(item.category || 'Other Services').trim() || 'Other Services';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {});

    return Object.entries(groups)
      .sort(([a], [b]) => {
        const aRank = rank.has(a.toLowerCase()) ? rank.get(a.toLowerCase()) : Number.MAX_SAFE_INTEGER;
        const bRank = rank.has(b.toLowerCase()) ? rank.get(b.toLowerCase()) : Number.MAX_SAFE_INTEGER;
        if (aRank !== bRank) return aRank - bRank;
        return a.localeCompare(b);
      })
      .map(([category, items]) => {
        const sorted = items.sort((x, y) => x.name.localeCompare(y.name) || x.amount - y.amount);
        const regularItems = collapseVariations(sorted.filter((item) => !item.is_add_on));
        const addOnItems = collapseVariations(sorted.filter((item) => item.is_add_on));
        return {
          category,
          regularItems,
          addOnItems,
        };
      });
  }, [stripeItems]);

  const activeServiceGroup = useMemo(() => {
    const group = serviceGroups.find(({ category }) => category === activeServiceCategory);
    if (!group) return null;

    const term = productSearch.trim().toLowerCase();
    if (!term) return group;
    const matchesSearch = (item) =>
      item.label.toLowerCase().includes(term) ||
      item.name.toLowerCase().includes(term) ||
      String(item.description || '').toLowerCase().includes(term) ||
      item.variations?.some((variation) =>
        String(variation.variation_name || '').toLowerCase().includes(term)
      );

    return {
      ...group,
      addOnItems: group.addOnItems.filter(matchesSearch),
      regularItems: group.regularItems.filter(matchesSearch),
    };
  }, [activeServiceCategory, productSearch, serviceGroups]);

  const categoryIcon = (category) => {
    const name = category.toLowerCase();
    if (name.includes('head')) return '💆‍♀️';
    if (name.includes('body') || name.includes('massage')) return '🌿';
    if (name.includes('foot') || name.includes('pedicure')) return '🦶';
    if (name.includes('manicure') || name.includes('nail')) return '💅';
    if (name.includes('side-by-side') || name.includes('couple')) return '🪷';
    return '✨';
  };

  const selectedServicesAmount = selectedServices.reduce(
    (sum, item) => sum + (item.amount / 100) * item.quantity,
    0
  );
  const enteredCustomAmount = parseFloat(amount) || 0;
  const manualAmount = customAmount;
  const primaryAmount = selectedServicesAmount + manualAmount;

  // ----- Amount math -----
  const baseAmount = primaryAmount;

  const couponAppliesToProductIds = new Set(
    Array.isArray(selectedCoupon?.applies_to_product_ids)
      ? selectedCoupon.applies_to_product_ids.filter(Boolean)
      : []
  );
  const hasCouponProductRestrictions = couponAppliesToProductIds.size > 0;

  const eligibleSelectedServicesAmount = selectedServices.reduce((sum, service) => {
    const serviceLineTotal = (service.amount / 100) * Math.max(1, Number(service.quantity || 1));
    if (!hasCouponProductRestrictions) return sum + serviceLineTotal;
    return couponAppliesToProductIds.has(service.product_id) ? sum + serviceLineTotal : sum;
  }, 0);

  // Product-restricted coupons only apply to matching services. Unrestricted
  // coupons also apply to any custom charge included in the sale.
  const couponEligibleAmount =
    eligibleSelectedServicesAmount + (hasCouponProductRestrictions ? 0 : manualAmount);

  const percentDiscountAmount =
    selectedCoupon?.discount_type === 'percent'
      ? couponEligibleAmount * ((selectedCoupon.percent_off || 0) / 100)
      : 0;
  const fixedDiscountAmount =
    selectedCoupon?.discount_type === 'amount' ? (selectedCoupon.amount_off || 0) / 100 : 0;
  const discountAmount = Math.min(couponEligibleAmount, percentDiscountAmount + fixedDiscountAmount);
  const amountAfterDiscount = baseAmount - discountAmount;
  const canRedeemRewards = Boolean(
    selectedCustomer?.rewardsEnrolled &&
    Number(selectedCustomer?.pointsBalance || 0) >= 500 &&
    amountAfterDiscount >= 10
  );
  const rewardPointsToRedeem = redeemRewards && canRedeemRewards ? 500 : 0;
  const rewardDiscountAmount = rewardPointsToRedeem ? 10 : 0;
  const amountAfterRewards = Math.max(0, amountAfterDiscount - rewardDiscountAmount);

  const amountAfterDiscountCents = Math.max(0, Math.round(amountAfterRewards * 100));
  const isCardPayment = paymentMethod === 'card' || paymentMethod === 'manual_card';
  const feeAmountCents = includeFee && isCardPayment ? Math.max(0, Math.round(amountAfterDiscountCents * 0.03)) : 0;
  const finalChargeAmount = amountAfterDiscountCents + feeAmountCents;
  const feeAmount = feeAmountCents / 100;
  const displayAmount = finalChargeAmount / 100;

  const refreshStripeItems = async () => {
    setLoadingStripeItems(true);
    setStripeItemsError(null);
    try {
      const r = await fetch('/api/list-terminal-products');
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setStripeItems(data.items || []);
    } catch (e) {
      setStripeItemsError(e.message || 'Failed to load Stripe products');
    } finally {
      setLoadingStripeItems(false);
    }
  };

  const refreshCoupons = async () => {
    setLoadingCoupons(true);
    setCouponsError(null);
    try {
      const r = await fetch('/api/list-terminal-coupons');
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setCoupons(data.coupons || []);
    } catch (e) {
      setCouponsError(e.message || 'Failed to load coupons');
    } finally {
      setLoadingCoupons(false);
    }
  };

  // ----- Load readers from backend -----
  const refreshReaders = async () => {
    setLoadingReaders(true);
    setReadersError(null);
    try {
      const r = await fetch('/api/list-readers');
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      const list = data.readers || [];
      setReaders(list);

      // Auto-select first reader if none chosen
      if (!selectedReaderId && list.length > 0) {
        setSelectedReaderId(list[0].id);
      }
    } catch (e) {
      setReadersError(e.message || 'Failed to load readers');
    } finally {
      setLoadingReaders(false);
    }
  };

  useEffect(() => {
    refreshReaders();
    refreshStripeItems();
    refreshCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const landscapeQuery = window.matchMedia(
      '(min-width: 900px) and (orientation: landscape)'
    );
    const updateScrollLock = () => {
      if (landscapeQuery.matches) {
        window.scrollTo(0, 0);
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';
      } else {
        document.body.style.overflow = previousBodyOverflow;
        document.documentElement.style.overflow = previousHtmlOverflow;
        document.body.style.overscrollBehavior = previousBodyOverscroll;
      }
    };

    updateScrollLock();
    landscapeQuery.addEventListener('change', updateScrollLock);

    return () => {
      landscapeQuery.removeEventListener('change', updateScrollLock);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, []);

  useEffect(() => {
    setCartPreviewShown(false);
  }, [selectedServices, selectedReaderId, includeFee, selectedCouponId, customAmount, redeemRewards]);

  useEffect(() => {
    if (!canRedeemRewards) setRedeemRewards(false);
  }, [canRedeemRewards]);

  useEffect(() => {
    if (!activeServiceCategory) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveServiceCategory(null);
        setProductSearch('');
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeServiceCategory]);

  const clearTerminalUiState = () => {
    setActivePaymentIntentId(null);
    setActiveReaderId(null);
    setCartPreviewShown(false);
  };

  const clearReaderDisplay = async (readerId) => {
    if (!readerId) return;
    try {
      await fetch('/api/clear-reader-display', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reader_id: readerId }),
      });
    } catch (error) {
      console.warn('Failed to clear reader display:', error);
    }
  };

  const waitForTerminalPaymentResult = async (paymentIntentId) => {
    const timeoutMs = 120000;
    const intervalMs = 2000;
    const startedAt = Date.now();
    let lastStatus = null;

    while (Date.now() - startedAt < timeoutMs) {
      const resp = await fetch('/api/payment-intent-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_intent_id: paymentIntentId }),
      });

      if (!resp.ok) {
        throw new Error(await resp.text());
      }

      const data = await resp.json();
      const status = data?.status;
      lastStatus = status;

      // For terminal/server-driven flows, requires_capture can still represent
      // a successful authorization depending on account settings.
      if (status === 'succeeded' || status === 'requires_capture') return 'succeeded';
      if (status === 'canceled') return 'canceled';

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    if (lastStatus === 'requires_payment_method') return 'not_completed';
    return 'timeout';
  };

  const resetForm = () => {
    setAmount('');
    setCustomAmount(0);
    setProductSearch('');
    setActiveServiceCategory(null);
    setSelectedServices([]);
    setIncludeFee(true);
    setSelectedCouponId('');
    setCartPreviewShown(false);
    setSearchResults([]);
    setRedeemRewards(false);
  };

  // ----- Search for customer by email, phone, or name -----
  const searchCustomer = async () => {
    if (!customerSearchQuery.trim()) {
      setCustomerSearchError('Please enter email, phone, or name');
      return;
    }

    setSearchingCustomer(true);
    setCustomerSearchError(null);
    setSearchResults([]);
    
    try {
      // Determine search type
      let searchType = 'name'; // default to name
      let searchParam = 'name';

      if (customerSearchQuery.includes('@')) {
        searchType = 'email';
        searchParam = 'email';
      } else if (/^\d/.test(customerSearchQuery.replace(/\D/g, ''))) {
        // Likely a phone number (starts with digit after removing non-digits)
        searchType = 'phone';
        searchParam = 'phone';
      }

      let searchValue = customerSearchQuery.trim();
      if (searchType === 'phone') {
        const normalized = normalizePhoneForStripe(searchValue);
        if (normalized) {
          searchValue = normalized;
          setCustomerSearchQuery(formatPhoneDisplay(searchValue));
        }
      }

      const resp = await fetch(
        `/api/register-cash-payment?${new URLSearchParams({
          [searchParam]: searchValue,
        })}`
      );

      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();

      if (data.customerFound) {
        if (data.multipleMatches) {
          // Multiple name matches found - let user pick
          setSearchResults(data.customers);
          setCustomerSearchError(null);
        } else {
          // Single match found
          setSelectedCustomer({
            id: data.customer.id,
            crmCustomerId: data.customer.crmCustomerId,
            email: data.customer.email,
            phone: data.customer.phone,
            name: data.customer.name || 'Stripe Customer',
            rewardsEnrolled: data.customer.rewardsEnrolled,
            pointsBalance: data.customer.pointsBalance,
          });
          setSearchResults([]);
          setCustomerSearchError(null);
        }
      } else {
        setSelectedCustomer(null);
        setSearchResults([]);
        setCustomerSearchError(`Customer not found in Stripe by ${searchType}`);
      }
    } catch (error) {
      console.error('Customer search failed:', error);
      setCustomerSearchError('Failed to search for customer');
    } finally {
      setSearchingCustomer(false);
    }
  };

  const addService = (matched) => {
    if (
      matched.is_add_on &&
      !selectedServices.some(
        (service) => !service.is_add_on && service.category === matched.category
      )
    ) {
      return;
    }

    setSelectedServices((prev) => {
      const existing = prev.find((service) => service.id === matched.id);
      if (existing) {
        return prev.map((service) =>
          service.id === matched.id ? { ...service, quantity: service.quantity + 1 } : service
        );
      }
      return [...prev, { ...matched, quantity: 1 }];
    });
  };

  const updateServiceQuantity = (id, nextQuantity) => {
    setSelectedServices((prev) => {
      const updated =
        nextQuantity <= 0
          ? prev.filter((service) => service.id !== id)
          : prev.map((service) =>
              service.id === id ? { ...service, quantity: nextQuantity } : service
            );
      const categoriesWithMainServices = new Set(
        updated
          .filter((service) => !service.is_add_on)
          .map((service) => service.category)
      );

      return updated.filter(
        (service) =>
          !service.is_add_on || categoriesWithMainServices.has(service.category)
      );
    });
  };

  // ----- Cancel server-driven payment -----
  const cancelPayment = async () => {
    if (!activePaymentIntentId && cartPreviewShown) {
      setIsCanceling(true);
      try {
        const clearResp = await fetch('/api/clear-reader-display', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reader_id: activeReaderId || selectedReaderId }),
        });

        if (!clearResp.ok) throw new Error(await clearResp.text());
        await clearResp.json();

        setPaymentStatus({ type: 'info', text: 'Reader cart cleared.' });
        setCartPreviewShown(false);
        alert('Reader cart cleared.');
      } catch (error) {
        console.error('Clear cart failed:', error);
        alert('Clear cart failed: ' + (error.message || String(error)));
      } finally {
        setIsCanceling(false);
      }
      return;
    }

    if (!activePaymentIntentId) return;

    setIsCanceling(true);
    try {
      const resp = await fetch('/api/cancel-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_intent_id: activePaymentIntentId,
          reader_id: activeReaderId || selectedReaderId,
        }),
      });

      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();

      alert('Payment canceled.');
      if (data?.reader_cancel_error) {
        alert(`Payment intent canceled, but reader cancel failed: ${data.reader_cancel_error}`);
      }
      setPaymentStatus({ type: 'info', text: 'Payment canceled.' });
      clearTerminalUiState();
      setIsLoading(false);
    } catch (error) {
      console.error('Cancel failed:', error);
      alert('Cancel failed: ' + (error.message || String(error)));
    } finally {
      setIsCanceling(false);
    }
  };

  // ----- Handle cash payment -----
  const handleCashPayment = async () => {
    setPaymentStatus(null);
    setReceipt(null);
    if (baseAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const baseServiceLines = [
        ...selectedServices.map((service) => ({
          name: service.variation_name
            ? `${service.name} — ${service.variation_name}`
            : service.name,
          amount: Math.max(0, Math.round(Number(service.amount || 0))),
          quantity: Math.max(1, Math.round(Number(service.quantity || 1))),
        })),
        ...(manualAmount > 0
          ? [{
              name: 'Custom amount',
              amount: Math.max(0, Math.round(manualAmount * 100)),
              quantity: 1,
            }]
          : []),
      ];

      const servicesForReceipt = baseServiceLines;

      // Register cash payment
      const resp = await fetch('/api/register-cash-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: finalChargeAmount,
          services: servicesForReceipt,
          couponCode: selectedCouponPayload?.code || '',
          discountAmount: discountAmount,
          customerId: selectedCustomer?.crmCustomerId || null,
          rewardPointsToRedeem,
          rewardDiscountAmount,
          stripeCustomerId: selectedCustomer?.id || null,
          customerEmail: selectedCustomer?.email || null,
          customerPhone: selectedCustomer?.phone || null,
          customerName: selectedCustomer?.name || null,
        }),
      });

      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();

      // Set receipt data for display
      setReceipt({
        paymentMethod: 'cash',
        receiptNumber: data.receiptNumber,
        timestamp: new Date(data.timestamp).toLocaleString(),
        amount: displayAmount,
        services: servicesForReceipt,
        discountAmount: discountAmount,
        rewardDiscountAmount,
        rewardPointsRedeemed: rewardPointsToRedeem,
        processingFeeAmount: 0,
        processingFeePercent: 0,
        tipAmount: 0,
        tipPercent: 0,
        subtotal: amountAfterRewards,
        customerName: selectedCustomer?.name || null,
        customerEmail: selectedCustomer?.email || null,
      });

      const pointsMessage = data.rewards?.pointsEarned
        ? ` ${data.rewards.pointsEarned} points earned.`
        : '';
      setPaymentStatus({ type: 'success', text: `Cash payment registered. Receipt generated.${pointsMessage}` });
      resetForm();
      setPaymentMethod('card'); // Reset to card for next transaction
      setSelectedCustomer(null); // Clear customer selection
      setCustomerSearchQuery(''); // Clear search query
    } catch (error) {
      console.error('Cash payment failed:', error);
      alert('Failed to register cash payment: ' + (error.message || String(error)));
      setPaymentStatus({ type: 'error', text: 'Failed to register cash payment.' });
    } finally {
      setIsLoading(false);
    }
  };

  // ----- Server-driven payment -----
  const handleManualCardPayment = async () => {
    setPaymentStatus(null);
    setReceipt(null);
    setManualCardError('');

    const cardElement = elements?.getElement(CardElement);
    if (!stripe || !elements || !cardElement) {
      setManualCardError('Secure card entry is still loading. Please try again.');
      return;
    }
    if (!manualCardComplete) {
      setManualCardError('Please enter the complete card information.');
      return;
    }
    if (baseAmount <= 0) {
      setManualCardError('Please enter a valid amount.');
      return;
    }

    const baseServiceLines = [
      ...selectedServices.map((service) => ({
        name: service.variation_name ? `${service.name} — ${service.variation_name}` : service.name,
        amount: Math.max(0, Math.round(Number(service.amount || 0))),
        quantity: Math.max(1, Math.round(Number(service.quantity || 1))),
      })),
      ...(manualAmount > 0
        ? [{ name: 'Custom amount', amount: Math.max(0, Math.round(manualAmount * 100)), quantity: 1 }]
        : []),
    ];
    const servicesForCharge = feeAmountCents > 0
      ? [...baseServiceLines, { name: 'Processing fee (3%)', amount: feeAmountCents, quantity: 1 }]
      : baseServiceLines;

    setIsLoading(true);
    try {
      const piResp = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalChargeAmount,
          currency: 'usd',
          payment_method_type: 'card',
          services: servicesForCharge,
          stripe_customer_id: selectedCustomer?.id || '',
          customer_name: selectedCustomer?.name || '',
          customer_email: selectedCustomer?.email || '',
          customer_phone: selectedCustomer?.phone || '',
          customer_id: selectedCustomer?.crmCustomerId || '',
          coupon_code: selectedCouponPayload?.code || '',
          coupon_id: selectedCouponPayload?.coupon_id || '',
          promotion_code_id: selectedCouponPayload?.promotion_code_id || '',
          coupon_name: selectedCouponPayload?.name || '',
          coupon_discount_type: selectedCouponPayload?.discount_type || '',
          coupon_percent_off: selectedCouponPayload?.percent_off,
          coupon_amount_off_cents: selectedCouponPayload?.amount_off,
          coupon_currency: selectedCouponPayload?.currency || '',
          coupon_discount_display: selectedCouponPayload?.discount_display || '',
          discount_amount_cents: Math.max(0, Math.round(discountAmount * 100)),
          reward_points_to_redeem: rewardPointsToRedeem,
          reward_discount_amount_cents: Math.round(rewardDiscountAmount * 100),
          processing_fee_amount_cents: Math.max(0, Math.round(feeAmountCents || 0)),
        }),
      });
      const piData = await piResp.json();
      if (!piResp.ok) throw new Error(piData.error || 'Could not start card payment.');

      const confirmation = await stripe.confirmCardPayment(piData.client_secret, {
        payment_method: { card: cardElement },
      });
      if (confirmation.error) throw new Error(confirmation.error.message);
      if (confirmation.paymentIntent?.status !== 'succeeded') {
        throw new Error('The card payment was not completed.');
      }

      const finalizeResponse = await fetch('/api/finalize-terminal-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_intent_id: piData.payment_intent_id }),
      });
      const finalizedPayment = await finalizeResponse.json();
      if (!finalizeResponse.ok) {
        throw new Error(finalizedPayment.error || 'Payment succeeded, but the receipt could not be finalized.');
      }

      setReceipt({
        paymentMethod: 'card',
        receiptNumber: piData.payment_intent_id,
        timestamp: new Date().toLocaleString(),
        amount: Number(finalizedPayment.total_amount_cents ?? finalChargeAmount) / 100,
        services: baseServiceLines,
        discountAmount,
        rewardDiscountAmount,
        rewardPointsRedeemed: rewardPointsToRedeem,
        processingFeeAmount: feeAmountCents / 100,
        processingFeePercent: amountAfterDiscountCents > 0 ? (feeAmountCents / amountAfterDiscountCents) * 100 : 0,
        tipAmount: 0,
        tipPercent: 0,
        customerName: selectedCustomer?.name || null,
        customerEmail: selectedCustomer?.email || null,
      });
      if (finalizedPayment.rewards && selectedCustomer) {
        setSelectedCustomer((customer) => ({ ...customer, pointsBalance: finalizedPayment.rewards.pointsBalance }));
      }
      setPaymentStatus({ type: 'success', text: 'Manual card payment successful.' });
      cardElement.clear();
      setManualCardComplete(false);
      resetForm();
    } catch (error) {
      console.error('Manual card payment failed:', error);
      setManualCardError(error.message || 'Manual card payment failed. Please try again.');
      setPaymentStatus({ type: 'error', text: 'Card payment was not completed.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    setPaymentStatus(null);
    setReceipt(null);
    if (!selectedReaderId) {
      alert('Please select a reader first');
      return;
    }
    if (baseAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const baseServiceLines = [
        ...selectedServices.map((service) => ({
          name: service.variation_name
            ? `${service.name} — ${service.variation_name}`
            : service.name,
          amount: Math.max(0, Math.round(Number(service.amount || 0))),
          quantity: Math.max(1, Math.round(Number(service.quantity || 1))),
        })),
        ...(manualAmount > 0
          ? [{
              name: 'Custom amount',
              amount: Math.max(0, Math.round(manualAmount * 100)),
              quantity: 1,
            }]
          : []),
      ];

      const linesWithCustomCharge = baseServiceLines;

      const servicesForCharge =
        feeAmountCents > 0
          ? [
              ...linesWithCustomCharge,
              {
                name: 'Processing fee (3%)',
                amount: feeAmountCents,
                quantity: 1,
              },
            ]
          : linesWithCustomCharge;

      if (selectedServices.length > 0 && !cartPreviewShown) {
        const displayResp = await fetch('/api/display-cart-on-reader', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reader_id: selectedReaderId,
            amount: finalChargeAmount,
            services: servicesForCharge,
          }),
        });

        if (!displayResp.ok) throw new Error(await displayResp.text());
        const displayData = await displayResp.json();
        if (!displayData.ok) {
          throw new Error(displayData.reader_display_error || 'Failed to show services on reader');
        }

        setCartPreviewShown(true);
        setPaymentStatus({ type: 'info', text: 'Services shown on reader. Click charge to start payment.' });
        alert('Services displayed on reader. Press charge again to start payment.');
        return;
      }

      // 1) Create PI
      const piResp = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalChargeAmount,
          currency: 'usd',
          services: servicesForCharge,
          stripe_customer_id: selectedCustomer?.id || '',
          customer_name: selectedCustomer?.name || '',
          customer_email: selectedCustomer?.email || '',
          customer_phone: selectedCustomer?.phone || '',
          customer_id: selectedCustomer?.crmCustomerId || '',
          coupon_code: selectedCouponPayload?.code || '',
          coupon_id: selectedCouponPayload?.coupon_id || '',
          promotion_code_id: selectedCouponPayload?.promotion_code_id || '',
          coupon_name: selectedCouponPayload?.name || '',
          coupon_discount_type: selectedCouponPayload?.discount_type || '',
          coupon_percent_off: selectedCouponPayload?.percent_off,
          coupon_amount_off_cents: selectedCouponPayload?.amount_off,
          coupon_currency: selectedCouponPayload?.currency || '',
          coupon_discount_display: selectedCouponPayload?.discount_display || '',
          discount_amount_cents: Math.max(0, Math.round(discountAmount * 100)),
          reward_points_to_redeem: rewardPointsToRedeem,
          reward_discount_amount_cents: Math.round(rewardDiscountAmount * 100),
          processing_fee_amount_cents: Math.max(0, Math.round(feeAmountCents || 0)),
        }),
      });

      if (!piResp.ok) throw new Error(await piResp.text());
      const piData = await piResp.json();

      if (!piData.payment_intent_id) {
        throw new Error('Missing payment_intent_id from create-payment-intent response');
      }

      // store PI so we can cancel from UI
      setActivePaymentIntentId(piData.payment_intent_id);
      setActiveReaderId(selectedReaderId);

      // 2) Tell reader to process it
      const processResp = await fetch('/api/process-on-reader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reader_id: selectedReaderId,
          payment_intent_id: piData.payment_intent_id,
          amount: finalChargeAmount,
          services: servicesForCharge,
        }),
      });

      if (!processResp.ok) throw new Error(await processResp.text());
      await processResp.json();

      setPaymentStatus({ type: 'info', text: 'Waiting for payment on terminal...' });
      const paymentResult = await waitForTerminalPaymentResult(piData.payment_intent_id);

      if (paymentResult === 'succeeded') {
        let finalizedPayment = null;
        try {
          const finalizeResponse = await fetch('/api/finalize-terminal-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_intent_id: piData.payment_intent_id }),
          });
          const finalizeData = await finalizeResponse.json();
          if (!finalizeResponse.ok) throw new Error(finalizeData.error || 'Could not record payment rewards.');
          finalizedPayment = finalizeData;
          if (finalizeData.rewards && selectedCustomer) {
            setSelectedCustomer((customer) => ({ ...customer, pointsBalance: finalizeData.rewards.pointsBalance }));
            setPaymentStatus({ type: 'success', text: `Payment successful. ${finalizeData.rewards.pointsEarned} points earned${finalizeData.rewards.pointsRedeemed ? ` and ${finalizeData.rewards.pointsRedeemed} points redeemed` : ''}.` });
          }
        } catch (finalizeError) {
          console.warn('Failed to finalize terminal payment breakdown:', finalizeError);
          setPaymentStatus({ type: 'error', text: `Payment succeeded, but rewards need attention: ${finalizeError.message}` });
        }

        await clearReaderDisplay(selectedReaderId);
        if (!selectedCustomer) setPaymentStatus({ type: 'success', text: 'Payment successful.' });
        setReceipt({
          paymentMethod: 'card',
          receiptNumber: piData.payment_intent_id,
          timestamp: new Date().toLocaleString(),
          amount: Number(finalizedPayment?.total_amount_cents ?? finalChargeAmount) / 100,
          services: baseServiceLines,
          discountAmount,
          rewardDiscountAmount,
          rewardPointsRedeemed: rewardPointsToRedeem,
          processingFeeAmount: feeAmountCents / 100,
          processingFeePercent:
            amountAfterDiscountCents > 0 ? (feeAmountCents / amountAfterDiscountCents) * 100 : 0,
          tipAmount: Number(finalizedPayment?.tip_amount_cents || 0) / 100,
          tipPercent:
            Number(finalizedPayment?.tip_amount_cents || 0) > 0 &&
            Number(finalizedPayment?.total_amount_cents || 0) > Number(finalizedPayment?.tip_amount_cents || 0)
              ? (Number(finalizedPayment.tip_amount_cents) /
                  (Number(finalizedPayment.total_amount_cents) - Number(finalizedPayment.tip_amount_cents))) * 100
              : 0,
          customerName: selectedCustomer?.name || null,
          customerEmail: selectedCustomer?.email || null,
        });
        clearTerminalUiState();
        resetForm();
        return;
      }

      if (paymentResult === 'canceled' || paymentResult === 'failed') {
        setPaymentStatus({
          type: 'error',
          text: paymentResult === 'canceled' ? 'Payment was canceled.' : 'Payment failed. Please try again.',
        });
        clearTerminalUiState();
        return;
      }

      if (paymentResult === 'not_completed') {
        setPaymentStatus({
          type: 'info',
          text: 'Payment was not completed on the reader. You can try charging again.',
        });
        clearTerminalUiState();
        return;
      }

      setPaymentStatus({
        type: 'info',
        text: 'Payment is still processing on terminal. You can cancel if needed.',
      });
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed: ' + (error.message || String(error)));
      setPaymentStatus({ type: 'error', text: 'Payment failed. Please try again.' });
      clearTerminalUiState();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="terminal-shell mx-auto max-w-6xl rounded-xl border bg-white p-3 sm:p-4">
      <h2 className="mb-3 text-xl font-bold text-purple-700">Stripe Terminal</h2>

      {/* Receipt Display */}
      {receipt && (
        <div className="receipt-print">
          <h3 className="mb-2 text-lg font-bold text-green-700">
            {receipt.paymentMethod === 'card' ? 'Card Payment Receipt' : 'Cash Payment Receipt'}
          </h3>
          <div className="space-y-1 text-sm">
            <p><strong>Receipt #:</strong> {receipt.receiptNumber}</p>
            <p><strong>Date/Time:</strong> {receipt.timestamp}</p>
            {receipt.customerName && (
              <>
                <hr className="my-2" />
                <p><strong>Customer:</strong> {receipt.customerName}</p>
                {receipt.customerEmail && <p className="text-gray-600">{receipt.customerEmail}</p>}
              </>
            )}
            <hr className="my-2" />
            {receipt.services.map((service, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{service.name} x {service.quantity}</span>
                <span>${((service.amount * service.quantity) / 100).toFixed(2)}</span>
              </div>
            ))}
            {receipt.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-${receipt.discountAmount.toFixed(2)}</span>
              </div>
            )}
            {receipt.rewardDiscountAmount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Rewards ({receipt.rewardPointsRedeemed} points)</span>
                <span>-${receipt.rewardDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            {receipt.processingFeeAmount > 0 && (
              <div className="flex justify-between">
                <span>Processing fee ({receipt.processingFeePercent.toFixed(0)}%)</span>
                <span>${receipt.processingFeeAmount.toFixed(2)}</span>
              </div>
            )}
            {receipt.tipAmount > 0 && (
              <div className="flex justify-between">
                <span>Tip ({receipt.tipPercent.toFixed(0)}%)</span>
                <span>${receipt.tipAmount.toFixed(2)}</span>
              </div>
            )}
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Paid:</span>
              <span>${receipt.amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="terminal-dashboard">
      {/* Payment Method Selection */}
      <div className="terminal-payment-method mb-3 rounded-lg border bg-gray-50 p-3">
        <h3 className="mb-2 text-sm font-semibold">Payment Method</h3>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={paymentMethod === 'card'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={isLoading || isCanceling}
              className="mr-2"
            />
            <span className="text-sm">Card Reader (tap/insert)</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="paymentMethod"
              value="manual_card"
              checked={paymentMethod === 'manual_card'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={isLoading || isCanceling}
              className="mr-2"
            />
            <span className="text-sm">Enter Card Manually</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="paymentMethod"
              value="cash"
              checked={paymentMethod === 'cash'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={isLoading || isCanceling}
              className="mr-2"
            />
            <span className="text-sm">Cash Payment</span>
          </label>
        </div>
      </div>

      {/* Customer Lookup (Optional) */}
      <div className="terminal-customer mb-3 rounded-lg border bg-blue-50 p-3">
        <h3 className="mb-2 text-sm font-semibold">Attach to Customer (Optional)</h3>
        <div className="space-y-2">
          <p className="text-xs text-gray-600">Search by email, phone, or name</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customerSearchQuery}
              onChange={(e) => setCustomerSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchCustomer()}
              placeholder="Email, phone, or name"
              className="flex-1 p-2 border rounded text-sm"
              disabled={searchingCustomer || isLoading}
            />
            <button
              onClick={searchCustomer}
              disabled={searchingCustomer || isLoading || !customerSearchQuery.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {searchingCustomer ? 'Searching...' : 'Search'}
            </button>
            {selectedCustomer && (
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setRedeemRewards(false);
                  setCustomerSearchQuery('');
                  setSearchResults([]);
                }}
                className="bg-gray-400 text-white px-3 py-2 rounded text-sm hover:bg-gray-500"
                title="Clear customer selection"
              >
                ✕
              </button>
            )}
          </div>

          {customerSearchError && (
            <p className="text-xs text-red-600">{customerSearchError}</p>
          )}

          {/* Multiple results found - let user pick */}
          {searchResults.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded space-y-2">
              <p className="text-xs font-semibold text-yellow-800">Multiple customers found. Select one:</p>
              {searchResults.map((customer) => (
                <button
                  key={customer.crmCustomerId || customer.id}
                  onClick={() => {
                    setSelectedCustomer({
                      id: customer.id,
                      crmCustomerId: customer.crmCustomerId,
                      email: customer.email,
                      phone: customer.phone,
                      name: customer.name || 'Stripe Customer',
                      rewardsEnrolled: customer.rewardsEnrolled,
                      pointsBalance: customer.pointsBalance,
                    });
                    setSearchResults([]);
                  }}
                  className="w-full text-left p-2 bg-white border border-yellow-200 rounded hover:bg-yellow-100 text-sm transition"
                >
                  <div className="font-semibold text-yellow-900">{customer.name}</div>
                  <div className="text-xs text-gray-600">
                    {customer.email || customer.phone}
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedCustomer && searchResults.length === 0 && (
            <div className="p-3 bg-green-100 border border-green-300 rounded text-sm">
              <p className="font-semibold text-green-800">{selectedCustomer.name}</p>
              <p className="text-green-700 text-xs">{selectedCustomer.email || selectedCustomer.phone}</p>
              <div className="mt-3 border-t border-green-300 pt-3">
                {selectedCustomer.rewardsEnrolled ? (
                  <>
                    <div className="flex items-center justify-between"><span className="font-medium text-green-900">Lavender Rewards</span><strong className="text-green-900">{Number(selectedCustomer.pointsBalance || 0)} points</strong></div>
                    {Number(selectedCustomer.pointsBalance || 0) >= 500 ? (
                      <label className={`mt-3 flex items-center gap-2 rounded-lg border p-3 ${amountAfterDiscount >= 10 ? 'cursor-pointer border-green-400 bg-white' : 'border-stone-200 bg-stone-50 text-stone-500'}`}>
                        <input type="checkbox" checked={redeemRewards} disabled={amountAfterDiscount < 10 || isLoading} onChange={(event) => setRedeemRewards(event.target.checked)} />
                        <span><strong className="block">Redeem 500 points</strong><span className="text-xs">Apply $10.00 off this charge</span></span>
                      </label>
                    ) : <p className="mt-2 text-xs text-green-800">{500 - Number(selectedCustomer.pointsBalance || 0)} more points needed for a $10 reward.</p>}
                  </>
                ) : <p className="text-xs text-green-800">This customer is not enrolled in rewards.</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Amount Input */}
      <div className="terminal-sale mb-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-stone-800">Choose Services</h3>
            <p className="mt-1 text-xs text-stone-500">Tap a category, then tap a service to add it.</p>
          </div>
          <button
            onClick={refreshStripeItems}
            className="flex-none rounded-lg border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 transition hover:bg-purple-50 disabled:opacity-60"
            disabled={isLoading || isCanceling || loadingStripeItems}
          >
            {loadingStripeItems ? 'Refreshing…' : 'Refresh services'}
          </button>
        </div>
        {loadingStripeItems ? (
          <div className="p-3 border rounded-lg bg-gray-50 text-sm text-gray-600 mb-3">
            Loading Stripe products...
          </div>
        ) : stripeItemsError ? (
          <div className="p-3 border rounded-lg bg-red-50 border-red-200 text-sm mb-3">
            <p className="text-red-600">Failed to load products: {stripeItemsError}</p>
            <button
              onClick={refreshStripeItems}
              className="mt-2 bg-purple-600 text-white px-3 py-2 rounded text-xs"
              disabled={isLoading || isCanceling}
            >
              Retry Products
            </button>
          </div>
        ) : (
          <div className="space-y-2 mb-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {serviceGroups.map((group) => {
                const itemCount = group.regularItems.length + group.addOnItems.length;
                return (
                  <button
                    key={group.category}
                    type="button"
                    onClick={() => {
                      setProductSearch('');
                      setActiveServiceCategory(group.category);
                    }}
                    className="flex min-h-[72px] items-center gap-2.5 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-2.5 text-left shadow-sm transition active:scale-[0.98] disabled:opacity-60"
                    disabled={isLoading || isCanceling}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-base shadow-sm" aria-hidden="true">
                      {categoryIcon(group.category)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold leading-tight text-purple-900">
                        {group.category}
                      </span>
                      <span className="mt-1 block text-[10px] text-purple-600">
                        {itemCount} {itemCount === 1 ? 'option' : 'options'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {serviceGroups.length === 0 && (
              <div className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-600">
                No services are currently available.
              </div>
            )}
            {selectedServices.length > 0 && (
              <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
                <p className="text-sm font-medium">Selected Services</p>
                {selectedServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate font-medium">{service.name}</p>
                      {service.variation_name && (
                        <span className="flex-none rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                          {service.variation_name}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      <span className="font-semibold text-purple-800">
                        ${(service.amount / 100).toFixed(2)}
                      </span>
                      <button
                        onClick={() => updateServiceQuantity(service.id, service.quantity - 1)}
                        className="px-2 py-1 border rounded"
                        disabled={isLoading || isCanceling}
                      >
                        -
                      </button>
                      <span className="w-5 text-center">{service.quantity}</span>
                      <button
                        onClick={() => updateServiceQuantity(service.id, service.quantity + 1)}
                        className="px-2 py-1 border rounded"
                        disabled={isLoading || isCanceling}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeServiceGroup && (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-stone-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-category-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setActiveServiceCategory(null);
                setProductSearch('');
              }
            }}
          >
            <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl bg-[#fbfaf7] shadow-2xl sm:max-h-[92vh] sm:rounded-2xl">
              <div className="border-b border-stone-200 bg-white px-4 py-3 sm:px-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-purple-600">Service category</p>
                    <h2 id="service-category-title" className="mt-0.5 text-xl font-bold text-purple-950">
                      {activeServiceGroup.category}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveServiceCategory(null);
                      setProductSearch('');
                    }}
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-stone-100 text-xl text-stone-700"
                    aria-label="Close service category"
                  >
                    ×
                  </button>
                </div>
                <input
                  type="search"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder={`Search ${activeServiceGroup.category}...`}
                  className="mt-2 min-h-[42px] w-full rounded-lg border border-stone-300 bg-stone-50 px-3 text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>

              <div className="overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
                {activeServiceGroup.addOnItems.length > 0 && (
                  <section className="mb-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">Add-ons</span>
                      <span className="text-xs text-stone-500">Requires a main service from this category</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {activeServiceGroup.addOnItems.map((item) => (
                        <ServicePickerButton key={item.id} item={item} selectedServices={selectedServices} onAdd={addService} onQuantityChange={updateServiceQuantity} isAddOn />
                      ))}
                    </div>
                  </section>
                )}

                {activeServiceGroup.regularItems.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">Services</h3>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {activeServiceGroup.regularItems.map((item) => (
                        <ServicePickerButton key={item.id} item={item} selectedServices={selectedServices} onAdd={addService} onQuantityChange={updateServiceQuantity} />
                      ))}
                    </div>
                  </section>
                )}

                {activeServiceGroup.addOnItems.length === 0 && activeServiceGroup.regularItems.length === 0 && (
                  <div className="py-16 text-center">
                    <p className="font-semibold text-stone-700">No matching services</p>
                    <button type="button" onClick={() => setProductSearch('')} className="mt-3 text-sm font-semibold text-purple-700">
                      Clear search
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-stone-200 bg-white p-3 sm:px-5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveServiceCategory(null);
                    setProductSearch('');
                  }}
                  className="min-h-[44px] w-full rounded-lg bg-purple-700 px-5 text-sm font-bold text-white active:bg-purple-800"
                >
                  Done{selectedServices.length > 0 ? ` · ${selectedServices.reduce((sum, service) => sum + service.quantity, 0)} selected` : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-2 flex items-center gap-3 rounded-lg border bg-stone-50 p-2">
          <label htmlFor="custom-sale-amount" className="flex-none text-sm font-medium text-stone-700">
            Custom sale
          </label>
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-500">$</span>
            <input
              id="custom-sale-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border bg-white py-2 pl-7 pr-3 text-base"
              disabled={isLoading || isCanceling}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (enteredCustomAmount < 0.5) return;
              setCustomAmount((current) =>
                Math.round((current + enteredCustomAmount) * 100) / 100
              );
              setAmount('');
            }}
            disabled={enteredCustomAmount < 0.5 || isLoading || isCanceling}
            className="flex-none rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            Add
          </button>
        </div>

        {manualAmount > 0 && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-purple-200 bg-purple-50 p-2.5 text-sm">
            <div>
              <span className="font-medium text-purple-950">Custom sale added</span>
              <span className="ml-2 font-bold text-purple-800">${manualAmount.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={() => setCustomAmount(0)}
              disabled={isLoading || isCanceling}
              className="rounded border border-purple-300 bg-white px-3 py-1 font-semibold text-purple-700 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        )}

        {/* Discount Options */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-2">Coupon</label>
          {loadingCoupons ? (
            <div className="p-2 border rounded-lg bg-gray-50 text-sm text-gray-600">
              Loading coupons...
            </div>
          ) : couponsError ? (
            <div className="p-2 border rounded-lg bg-red-50 border-red-200 text-sm">
              <p className="text-red-600">Failed to load coupons: {couponsError}</p>
              <button
                onClick={refreshCoupons}
                disabled={isLoading || isCanceling}
                className="mt-2 bg-purple-600 text-white px-3 py-2 rounded text-xs"
              >
                Retry Coupons
              </button>
            </div>
          ) : (
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedCouponId('')}
                disabled={isLoading || isCanceling}
                aria-pressed={!selectedCouponId}
                className={`min-h-[38px] flex-none whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${
                  !selectedCouponId
                    ? 'border-purple-600 bg-purple-700 text-white shadow-sm'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-purple-300 hover:bg-purple-50'
                }`}
              >
                No coupon
              </button>
              {coupons.slice(0, 5).map((coupon) => {
                const selected = selectedCouponId === coupon.id;
                return (
                  <button
                    key={coupon.id}
                    type="button"
                    onClick={() => setSelectedCouponId(selected ? '' : coupon.id)}
                    disabled={isLoading || isCanceling}
                    aria-pressed={selected}
                    className={`min-h-[38px] flex-none whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-left transition disabled:opacity-50 ${
                      selected
                        ? 'border-purple-600 bg-purple-700 text-white shadow-sm'
                        : 'border-purple-200 bg-white text-purple-900 hover:border-purple-400 hover:bg-purple-50'
                    }`}
                  >
                    <span className="text-[11px] font-bold">{coupon.code || coupon.name}</span>
                    <span className={`ml-1 text-[9px] ${selected ? 'text-purple-100' : 'text-purple-600'}`}>
                      · {coupon.discount_display}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Reader Selection (server-driven) - Only for Card Payments */}
      {paymentMethod === 'card' && (
        <div className="terminal-reader mb-3">
          {loadingReaders ? (
            <div className="rounded-lg border bg-gray-50 p-2 text-center text-sm text-gray-600">
              Loading readers...
            </div>
          ) : readersError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2">
              <p className="text-red-600 text-sm">Failed to load readers: {readersError}</p>
              <button
                onClick={refreshReaders}
                className="mt-2 bg-purple-600 text-white px-4 py-2 rounded text-sm"
                disabled={isLoading || isCanceling}
              >
                Retry
              </button>
            </div>
          ) : readers.length === 0 ? (
            <div className="rounded-lg border bg-gray-50 p-2 text-center">
              <p className="text-gray-600">No readers found in Stripe.</p>
              <button
                onClick={refreshReaders}
                className="mt-2 bg-purple-600 text-white px-4 py-2 rounded text-sm"
                disabled={isLoading || isCanceling}
              >
                Refresh
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={selectedReaderId}
                onChange={(e) => setSelectedReaderId(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border bg-white p-2 text-sm"
                disabled={isLoading || isCanceling}
              >
                {readers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label || r.device_type || 'Reader'} — {r.id}
                  </option>
                ))}
              </select>

              <button
                onClick={refreshReaders}
                className="flex-none rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
                disabled={isLoading || isCanceling}
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      )}

      {paymentMethod === 'manual_card' && (
        <div className="mb-3 rounded-lg border border-purple-200 bg-white p-3">
          <label className="mb-2 block text-sm font-semibold text-stone-800">
            Card information
          </label>
          {manualCardConfigured ? (
            <div className="rounded-lg border border-stone-300 bg-white px-3 py-3 shadow-sm focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100">
              <CardElement
                options={{
                  hidePostalCode: false,
                  style: {
                    base: { fontSize: '16px', color: '#292524', '::placeholder': { color: '#a8a29e' } },
                    invalid: { color: '#dc2626' },
                  },
                }}
                onChange={(event) => {
                  setManualCardComplete(event.complete);
                  setManualCardError(event.error?.message || '');
                }}
              />
            </div>
          ) : (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              Manual card entry needs the Stripe publishable key configured for this site.
            </div>
          )}
          <p className="mt-2 text-xs text-stone-500">
            Card details are securely collected by Stripe and are not stored by this website.
          </p>
          {manualCardError && <p className="mt-2 text-sm text-red-600">{manualCardError}</p>}
        </div>
      )}

      {/* Payment Buttons */}
      <div className="terminal-actions space-y-2">
        {receipt && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-gradient-to-r from-white to-purple-50 px-4 py-2 text-xs font-bold text-purple-800 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-md active:translate-y-0"
            >
              <span aria-hidden="true">🖨️</span>
              Print receipt
            </button>
          </div>
        )}

        {paymentStatus && (
          <div
            className={`p-3 rounded text-sm ${
              paymentStatus.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : paymentStatus.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {paymentStatus.text}
          </div>
        )}

        {baseAmount > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-2">
            <div className="flex justify-between text-xs text-blue-900">
              <span>Subtotal</span>
              <span>${primaryAmount.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-green-700">
                <span>Coupon{selectedCoupon?.code ? ` (${selectedCoupon.code})` : ''}</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            {rewardDiscountAmount > 0 && (
              <div className="flex justify-between text-xs text-green-700">
                <span>Rewards</span>
                <span>-$10.00</span>
              </div>
            )}
            {includeFee && isCardPayment && (
              <div className="flex justify-between text-xs text-blue-900">
                <span>Processing fee (3%)</span>
                <span>+${feeAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-blue-200 pt-1 text-base font-bold text-blue-950">
              <span>Total charge</span>
              <span>${displayAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        {paymentMethod === 'card' ? (
          <>
            <button
              onClick={handlePayment}
              disabled={!selectedReaderId || baseAmount <= 0 || isLoading || isCanceling}
              className="w-full rounded-lg bg-green-600 p-3 text-base font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isLoading
                ? 'Sending to reader...'
                : selectedServices.length > 0 && !cartPreviewShown
                  ? `Show Services on Reader ($${displayAmount.toFixed(2)})`
                  : `Charge $${displayAmount.toFixed(2) || '0.00'}`}
            </button>

            {/* Cancel Button - show when we have an active PI to cancel */}
            {(activePaymentIntentId || cartPreviewShown) && (
              <button
                onClick={cancelPayment}
                disabled={isCanceling}
                className="w-full rounded-lg bg-red-600 p-3 text-base font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {isCanceling ? 'Canceling...' : cartPreviewShown && !activePaymentIntentId ? 'Clear Reader Cart' : 'Cancel Payment'}
              </button>
            )}
          </>
        ) : paymentMethod === 'manual_card' ? (
          <button
            onClick={handleManualCardPayment}
            disabled={!manualCardConfigured || !stripe || !manualCardComplete || baseAmount <= 0 || isLoading}
            className="w-full rounded-lg bg-green-600 p-3 text-base font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isLoading ? 'Processing card...' : `Charge Card $${displayAmount.toFixed(2) || '0.00'}`}
          </button>
        ) : (
          <button
            onClick={handleCashPayment}
            disabled={baseAmount <= 0 || isLoading}
            className="w-full rounded-lg bg-blue-600 p-3 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isLoading ? 'Registering...' : `Register Cash Payment - $${displayAmount.toFixed(2) || '0.00'}`}
          </button>
        )}

      </div>
      </div>
    </div>
  );
}
