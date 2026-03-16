import { useEffect, useMemo, useRef, useState } from "react";
import {
  CarFront,
  CircleAlert,
  CircleDashed,
  Loader2,
  MapPin,
  Trash2,
  TriangleAlert,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  doesCategoryRequireDescription,
  doesCategoryRequirePhotos,
  doesCategoryRequireSubtype,
  getCategoryDetails,
  getCategorySubOptions,
} from "../../data/driverBookingCatalog";

const problemPictogramMap = {
  tyre: {
    icon: CircleDashed,
    badge: "Reifen",
    accentClass: "border-sky-200 bg-sky-50 text-sky-700",
  },
  service: {
    icon: Wrench,
    badge: "Service",
    accentClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  technical_problem: {
    icon: TriangleAlert,
    badge: "Technisches Problem",
    accentClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  damage_report: {
    icon: CarFront,
    badge: "Schadensmeldung",
    accentClass: "border-rose-200 bg-rose-50 text-rose-700",
  },
  default: {
    icon: CircleAlert,
    badge: "Service",
    accentClass: "border-slate-200 bg-slate-100 text-slate-700",
  },
};

const buildDateChips = (baseValue) => {
  const baseDate = new Date(baseValue);
  const safeBase = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
  safeBase.setHours(0, 0, 0, 0);
  return Array.from({ length: 6 }, (_, offset) => {
    const next = new Date(safeBase);
    next.setDate(safeBase.getDate() + offset);
    return {
      id: next.toISOString().slice(0, 10),
      label: next.toLocaleDateString("en-US", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }),
    };
  });
};

const STATION_SEARCH_DEBOUNCE_MS = 300;
const STATION_MODAL_BATCH_SIZE = 24;
const STATION_MODAL_SCROLL_THROTTLE_MS = 180;

function ServiceCategoryCard({ option, isSelected, onSelect, cardKey }) {
  const pictogram =
    problemPictogramMap[option.iconKey] || problemPictogramMap.default;
  const Icon = pictogram.icon;

  return (
    <button
      className={`min-w-0 rounded-2xl border p-2.5 text-left transition sm:p-4 ${
        isSelected
          ? "border-slate-900 bg-slate-900 text-white shadow-lg"
          : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400"
      }`}
      key={cardKey || option.value}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-sm sm:size-10 ${
            isSelected
              ? "border-white/35 bg-white/15 text-white"
              : pictogram.accentClass
          }`}
        >
          <Icon size={16} strokeWidth={2.2} />
        </span>
        <span
          className={`max-w-[62%] truncate rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] sm:max-w-none sm:text-[11px] ${
            isSelected
              ? "bg-white/15 text-slate-100"
              : "bg-slate-200 text-slate-600"
          }`}
          title={pictogram.badge}
        >
          {pictogram.badge}
        </span>
      </div>
      <p className="mt-2.5 text-[13px] font-semibold leading-snug sm:mt-3 sm:text-sm">
        {option.label}
      </p>
      <p
        className={`mt-1 text-[11px] leading-snug sm:text-xs ${isSelected ? "text-slate-200" : "text-slate-500"}`}
      >
        {option.hint}
      </p>
    </button>
  );
}

function DriverServiceRequestSection({
  simpleIssueOptions,
  requestForm,
  setRequestForm,
  nearestPosOptions,
  selectedPos,
  slotAvailability,
  selectedSlot,
  isServiceRequestFormReady,
  isSubmittingRequest,
  onPhotoChange,
  policyValidation,
  eligibilityClass,
  handleSubmitSimpleRequest,
  wizardFeedback,
  driverServiceRequests,
  selectedRequest,
  setSelectedRequestId,
  requestStatusClass,
  formatDateTime,
}) {
  const [showAllServices, setShowAllServices] = useState(false);
  const [serviceOrder, setServiceOrder] = useState(() =>
    simpleIssueOptions.map((option) => option.value),
  );
  const [showAllStations, setShowAllStations] = useState(false);
  const [stationSearch, setStationSearch] = useState("");
  const [debouncedStationSearch, setDebouncedStationSearch] = useState("");
  const [visibleStationCount, setVisibleStationCount] = useState(
    STATION_MODAL_BATCH_SIZE,
  );
  const [isLoadingMoreStations, setIsLoadingMoreStations] = useState(false);
  const lastStationModalScrollAt = useRef(0);
  const loadMoreTimeoutRef = useRef(null);
  const nextSectionScrollTimeoutRef = useRef(null);
  const nearestPosSectionRef = useRef(null);
  const dateSlotSectionRef = useRef(null);
  const optionalDetailsSectionRef = useRef(null);
  const photoInputRef = useRef(null);
  const inlineServiceLimit = 6;
  const inlineStationLimit = 6;
  const categoryDetails = useMemo(
    () => getCategoryDetails(requestForm.problemType),
    [requestForm.problemType],
  );
  const categorySubOptions = useMemo(
    () => getCategorySubOptions(requestForm.problemType),
    [requestForm.problemType],
  );
  const requiresSubtype = useMemo(
    () => doesCategoryRequireSubtype(requestForm.problemType),
    [requestForm.problemType],
  );
  const requiresDescription = useMemo(
    () =>
      doesCategoryRequireDescription(
        requestForm.problemType,
        requestForm.problemSubtype,
      ),
    [requestForm.problemSubtype, requestForm.problemType],
  );
  const requiresPhotos = useMemo(
    () => doesCategoryRequirePhotos(requestForm.problemType),
    [requestForm.problemType],
  );
  const orderedServiceOptions = useMemo(() => {
    const byValue = new Map(
      simpleIssueOptions.map((option) => [option.value, option]),
    );
    const ordered = serviceOrder
      .map((value) => byValue.get(value))
      .filter(Boolean);
    const missing = simpleIssueOptions.filter(
      (option) => !serviceOrder.includes(option.value),
    );
    return [...ordered, ...missing];
  }, [serviceOrder, simpleIssueOptions]);
  const inlineServiceOptions = useMemo(
    () => orderedServiceOptions.slice(0, inlineServiceLimit),
    [orderedServiceOptions],
  );
  const hasMoreServices = orderedServiceOptions.length > inlineServiceLimit;
  const inlineStations = useMemo(() => {
    const base = nearestPosOptions.slice(0, inlineStationLimit);
    if (!selectedPos) {
      return base;
    }
    const isInBase = base.some((station) => station.id === selectedPos.id);
    if (isInBase) {
      return base;
    }
    if (base.length < inlineStationLimit) {
      return [...base, selectedPos];
    }
    return [...base.slice(0, inlineStationLimit - 1), selectedPos];
  }, [nearestPosOptions, selectedPos]);
  const hasMoreStations = nearestPosOptions.length > inlineStationLimit;
  const totalStationsCount = nearestPosOptions.length;

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedStationSearch(stationSearch);
      if (showAllStations) {
        setVisibleStationCount(STATION_MODAL_BATCH_SIZE);
        lastStationModalScrollAt.current = 0;
        setIsLoadingMoreStations(false);
      }
    }, STATION_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timerId);
  }, [showAllStations, stationSearch]);

  useEffect(
    () => () => {
      if (loadMoreTimeoutRef.current) {
        window.clearTimeout(loadMoreTimeoutRef.current);
      }
      if (nextSectionScrollTimeoutRef.current) {
        window.clearTimeout(nextSectionScrollTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (requestForm.photos.length === 0 && photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }, [requestForm.photos.length]);

  const scrollToSection = (targetRef) => {
    if (!targetRef?.current) {
      return;
    }
    if (nextSectionScrollTimeoutRef.current) {
      window.clearTimeout(nextSectionScrollTimeoutRef.current);
    }
    nextSectionScrollTimeoutRef.current = window.setTimeout(() => {
      targetRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
  };

  const filteredStations = useMemo(() => {
    const query = debouncedStationSearch.trim().toLowerCase();
    if (!query) {
      return nearestPosOptions;
    }
    return nearestPosOptions.filter((pos) => {
      const tags = Array.isArray(pos.capabilities)
        ? pos.capabilities.join(" ")
        : "";
      return `${pos.name} ${pos.address} ${tags}`.toLowerCase().includes(query);
    });
  }, [nearestPosOptions, debouncedStationSearch]);
  const visibleFilteredStations = useMemo(
    () => filteredStations.slice(0, visibleStationCount),
    [filteredStations, visibleStationCount],
  );
  const hasMoreFilteredStations =
    visibleFilteredStations.length < filteredStations.length;
  const isSearchDebouncing = stationSearch !== debouncedStationSearch;
  const dateChips = useMemo(
    () =>
      buildDateChips(
        requestForm.preferredDate || new Date().toISOString().slice(0, 10),
      ),
    [requestForm.preferredDate],
  );
  const photoPreviews = useMemo(
    () =>
      requestForm.photos.map((file) => ({
        file,
        id: `${file.name}-${file.size}-${file.lastModified}`,
        url: URL.createObjectURL(file),
      })),
    [requestForm.photos],
  );

  useEffect(
    () => () => {
      photoPreviews.forEach((preview) => {
        URL.revokeObjectURL(preview.url);
      });
    },
    [photoPreviews],
  );
  const handleServiceSelect = (
    serviceValue,
    { closeModal = false, moveToIndex = null } = {},
  ) => {
    setRequestForm((prev) => ({
      ...prev,
      problemType: serviceValue,
      problemSubtype: "",
      description: "",
      photos: [],
      preferredPosId: "",
      preferredSlotId: "",
    }));
    if (moveToIndex !== null && Number.isInteger(moveToIndex)) {
      setServiceOrder((prev) => {
        const withoutSelected = prev.filter((value) => value !== serviceValue);
        const targetIndex = Math.max(
          0,
          Math.min(moveToIndex, withoutSelected.length),
        );
        return [
          ...withoutSelected.slice(0, targetIndex),
          serviceValue,
          ...withoutSelected.slice(targetIndex),
        ];
      });
    }
    if (closeModal) {
      setShowAllServices(false);
    }
    scrollToSection(nearestPosSectionRef);
  };
  const handleSubtypeSelect = (subtypeValue) => {
    setRequestForm((prev) => ({
      ...prev,
      problemSubtype: subtypeValue,
    }));
    scrollToSection(nearestPosSectionRef);
  };
  const policyStatusLabel = "Covered";
  const policyStatusClass = eligibilityClass("Allowed");
  const clearAllPhotos = () => {
    setRequestForm((prev) => ({ ...prev, photos: [] }));
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };
  const removePhotoById = (photoId) => {
    setRequestForm((prev) => ({
      ...prev,
      photos: prev.photos.filter(
        (file) => `${file.name}-${file.size}-${file.lastModified}` !== photoId,
      ),
    }));
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };
  const renderStationCard = (pos, { closeOnSelect = false } = {}) => {
    const isSelected = requestForm.preferredPosId === pos.id;
    return (
      <button
        className={`min-w-0 rounded-xl border p-2.5 text-left transition sm:p-3 ${
          isSelected
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400"
        }`}
        key={pos.id}
        onClick={() => {
          setRequestForm((prev) => ({
            ...prev,
            preferredPosId: pos.id,
            preferredSlotId: "",
          }));
          if (closeOnSelect) {
            setShowAllStations(false);
          }
          scrollToSection(dateSlotSectionRef);
        }}
        type="button"
      >
        <div className="flex min-h-[110px] flex-col">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              {pos.type === "PointS" ? (
                <p
                  className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${
                    isSelected
                      ? "bg-white/20 text-slate-100"
                      : "bg-sky-100 text-sky-700"
                  }`}
                >
                  Point S Partner
                </p>
              ) : null}
              <p
                className="truncate text-[13px] font-semibold leading-5 sm:text-sm"
                title={pos.name}
              >
                {pos.name}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-[11px] ${
                isSelected
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {pos.distanceKm} km
            </span>
          </div>
          <p
            className={`mt-1 truncate text-[11px] sm:text-xs ${isSelected ? "text-slate-200" : "text-slate-600"}`}
            title={pos.address}
          >
            {pos.address}
          </p>
          <p
            className={`mt-1 text-[11px] sm:text-xs ${isSelected ? "text-slate-300" : "text-slate-500"}`}
          >
            ETA {pos.etaMin} mins
          </p>
          {Array.isArray(pos.capabilities) && pos.capabilities.length > 0 ? (
            <div className="mt-auto flex flex-wrap gap-1 pt-2">
              {pos.capabilities.slice(0, 3).map((tag) => (
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] ${
                    isSelected
                      ? "bg-white/20 text-slate-100"
                      : "bg-slate-200 text-slate-700"
                  }`}
                  key={`${pos.id}-${tag}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </button>
    );
  };
  const handleStationModalScroll = (event) => {
    const now = Date.now();
    if (
      now - lastStationModalScrollAt.current <
      STATION_MODAL_SCROLL_THROTTLE_MS
    ) {
      return;
    }
    lastStationModalScrollAt.current = now;

    const target = event.currentTarget;
    const isNearBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 72;
    if (!isNearBottom) {
      return;
    }
    if (
      isLoadingMoreStations ||
      visibleStationCount >= filteredStations.length
    ) {
      return;
    }

    setIsLoadingMoreStations(true);
    if (loadMoreTimeoutRef.current) {
      window.clearTimeout(loadMoreTimeoutRef.current);
    }
    loadMoreTimeoutRef.current = window.setTimeout(() => {
      setVisibleStationCount((prev) =>
        Math.min(prev + STATION_MODAL_BATCH_SIZE, filteredStations.length),
      );
      setIsLoadingMoreStations(false);
    }, 140);
  };

  return (
    <section className="min-w-0 space-y-4 sm:space-y-6">
      {isSubmittingRequest ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center shadow-2xl">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <Loader2 className="size-5 animate-spin" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              Sending service request...
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Please wait while we submit your details.
            </p>
          </div>
        </div>
      ) : null}
      <section className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="min-w-0 space-y-4 sm:space-y-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
              Service category
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              First-level service options with quick visual selection.
            </p>
            <div className="mt-4 flex justify-end">
              {hasMoreServices ? (
                <Button
                  onClick={() => setShowAllServices(true)}
                  type="button"
                  variant="outline"
                >
                  See all services
                </Button>
              ) : null}
            </div>
            <div className="mt-3 grid min-w-0 grid-cols-2 gap-2.5 sm:gap-3">
              {inlineServiceOptions.map((option) => (
                <ServiceCategoryCard
                  cardKey={option.value}
                  isSelected={requestForm.problemType === option.value}
                  key={option.value}
                  onSelect={() => handleServiceSelect(option.value)}
                  option={option}
                />
              ))}
            </div>
          </div>

          {requestForm.problemType ? (
            <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                {categoryDetails?.selectionLabel || "Service details"}
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                {categoryDetails?.selectionHint ||
                  "Choose the correct service detail before booking."}
              </p>
              {categorySubOptions.length > 0 ? (
                <div className="mt-4 grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {categorySubOptions.map((option) => {
                    const isSelected = requestForm.problemSubtype === option.value;
                    return (
                      <button
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                            : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400"
                        }`}
                        key={option.value}
                        onClick={() => handleSubtypeSelect(option.value)}
                        type="button"
                      >
                        <p className="text-sm font-semibold">{option.label}</p>
                        {option.requiresExplanation ? (
                          <p
                            className={`mt-1 text-xs ${
                              isSelected ? "text-slate-200" : "text-amber-700"
                            }`}
                          >
                            Explanation required
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {requestForm.problemType === "Technisches Problem" ? (
                    <p>
                      Please describe the issue in the field below or upload a
                      picture of the error message.
                    </p>
                  ) : requestForm.problemType === "Schadensmeldung" ? (
                    <p>
                      Please fill out the damage details below and upload clear
                      pictures of the damage.
                    </p>
                  ) : (
                    <p>Select the details below to continue.</p>
                  )}
                </div>
              )}
              {requiresSubtype && !requestForm.problemSubtype ? (
                <p className="mt-3 text-xs text-amber-700">
                  Select one service option to continue.
                </p>
              ) : null}
            </div>
          ) : null}

          <div
            className="scroll-mt-24 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:scroll-mt-28 sm:p-5"
            ref={nearestPosSectionRef}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                  Nearest Point of Sale
                </h2>
                {/* <p className="mt-1 text-sm text-slate-500">
                  Compact station cards with quick "See all stations" modal.
                </p> */}
              </div>
              <div className="flex flex-wrap gap-2">
                {hasMoreStations ? (
                  <Button
                    className="group border-sky-200 bg-gradient-to-r from-white to-sky-50 text-slate-800 shadow-sm transition hover:border-sky-300 hover:from-sky-50 hover:to-sky-100"
                    onClick={() => {
                      setVisibleStationCount(STATION_MODAL_BATCH_SIZE);
                      lastStationModalScrollAt.current = 0;
                      setIsLoadingMoreStations(false);
                      setShowAllStations(true);
                    }}
                    type="button"
                    variant="outline"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <MapPin size={12} />
                      </span>
                      <span>See all</span>
                      <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {totalStationsCount}
                      </span>
                    </span>
                  </Button>
                ) : null}
                {/* {selectedPos ? (
                  <Button
                    onClick={() => {
                      setRequestForm((prev) => ({
                        ...prev,
                        preferredPosId: "",
                        preferredSlotId: "",
                      }));
                    }}
                    type="button"
                    variant="outline"
                  >
                    Unselect station
                  </Button>
                ) : null} */}
              </div>
            </div>
            <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 min-[520px]:grid-cols-2 lg:grid-cols-3">
              {inlineStations.length === 0 ? (
                <p className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                  No nearby Point S stations found for selected service
                  category.
                </p>
              ) : (
                inlineStations.map((pos) => renderStationCard(pos))
              )}
            </div>
          </div>

          <div
            className="scroll-mt-24 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:scroll-mt-28 sm:p-5"
            ref={dateSlotSectionRef}
          >
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
              Select date and slot
            </h2>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {dateChips.map((chip) => {
                const active = requestForm.preferredDate === chip.id;
                return (
                  <button
                    className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs transition sm:text-sm ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400"
                    }`}
                    key={chip.id}
                    onClick={() =>
                      setRequestForm((prev) => ({
                        ...prev,
                        preferredDate: chip.id,
                        preferredSlotId: "",
                      }))
                    }
                    type="button"
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 xl:grid-cols-4">
              {slotAvailability.length === 0 ? (
                <p className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                  Select a Point S station to see slot availability.
                </p>
              ) : (
                slotAvailability.map((slot) => {
                  const isSelected = requestForm.preferredSlotId === slot.id;
                  const isBusy = slot.status === "Busy";
                  return (
                    <button
                      className={`min-w-0 rounded-xl border px-3 py-2 text-left transition ${
                        isBusy
                          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                          : isSelected
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500/40"
                            : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                      }`}
                      disabled={isBusy}
                      key={slot.id}
                      onClick={() => {
                        setRequestForm((prev) => ({
                          ...prev,
                          preferredSlotId: slot.id,
                        }));
                        scrollToSection(optionalDetailsSectionRef);
                      }}
                      type="button"
                    >
                      <p className="text-xs font-semibold sm:text-sm">
                        {slot.label}
                      </p>
                      <p className="mt-1 text-[10px] sm:text-[11px]">
                        {isBusy
                          ? `Busy (${slot.queue} in queue)`
                          : "Free to book"}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
            {selectedSlot ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 sm:text-xs">
                Selected slot:{" "}
                <span className="font-semibold">{selectedSlot.label}</span> on{" "}
                <span className="font-semibold">
                  {requestForm.preferredDate}
                </span>
              </div>
            ) : null}
          </div>

          <div
            className="scroll-mt-24 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:scroll-mt-28 sm:p-5"
            ref={optionalDetailsSectionRef}
          >
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
              {requiresDescription || requiresPhotos
                ? "Required details"
                : "Optional details"}
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              {requiresPhotos
                ? "Damage report requires a clear description and at least one photo."
                : requiresDescription
                  ? "Add the required issue details before sending the request."
                  : "Add short note or photos if available."}
            </p>
            <div className="mt-4 space-y-3">
              <Textarea
                onChange={(event) =>
                  setRequestForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder={
                  categoryDetails?.detailPlaceholder ||
                  "What happened? (optional)"
                }
                rows={4}
                value={requestForm.description}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
                <span className="font-medium text-slate-700">
                  {categoryDetails?.detailFieldLabel || "Issue details"}
                </span>
                {requiresDescription ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700">
                    Required
                  </span>
                ) : null}
              </div>
              <Input
                accept="image/*"
                className="w-full text-xs sm:text-sm"
                multiple
                onChange={onPhotoChange}
                ref={photoInputRef}
                type="file"
              />
              {requiresPhotos ? (
                <p className="text-[11px] text-amber-700 sm:text-xs">
                  At least one damage photo is required.
                </p>
              ) : null}
              {photoPreviews.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800">
                      Uploaded images
                    </p>
                    <button
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100"
                      onClick={clearAllPhotos}
                      type="button"
                    >
                      <Trash2 size={12} />
                      Clear all
                    </button>
                  </div>
                  <div className="card-list-scrollbar mt-3 grid max-h-[18rem] grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3">
                    {photoPreviews.map((preview) => (
                      <figure
                        className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                        key={preview.id}
                      >
                        <img
                          alt={preview.file.name}
                          className="h-24 w-full object-cover sm:h-28"
                          loading="lazy"
                          src={preview.url}
                        />
                        <button
                          aria-label={`Remove ${preview.file.name}`}
                          className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-slate-900/80 text-white opacity-100 transition hover:bg-rose-600 sm:opacity-0 sm:group-hover:opacity-100"
                          onClick={() => removePhotoById(preview.id)}
                          type="button"
                        >
                          <X size={12} />
                        </button>
                        <figcaption className="border-t border-slate-200 px-2 py-1.5">
                          <p
                            className="truncate text-[11px] font-medium text-slate-800"
                            title={preview.file.name}
                          >
                            {preview.file.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {Math.max(1, Math.round(preview.file.size / 1024))}{" "}
                            KB
                          </p>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              ) : null}
              <label className="flex items-center gap-2 text-xs text-slate-700 sm:text-sm">
                <input
                  checked={requestForm.emergency}
                  className="size-4 accent-slate-900"
                  onChange={(event) =>
                    setRequestForm((prev) => ({
                      ...prev,
                      emergency: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                Emergency breakdown
              </label>
            </div>
          </div>
        </div>

        <aside className="min-w-0 space-y-4 sm:space-y-6 xl:sticky xl:top-8 xl:self-start">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
              Request summary
            </h3>
            <div className="mt-4 space-y-3 text-xs text-slate-700 sm:text-sm">
              <p>
                Problem:{" "}
                <span className="font-semibold text-slate-900">
                  {requestForm.problemType || "Not selected"}
                </span>
              </p>
              <p>
                Service option:{" "}
                <span className="font-semibold text-slate-900">
                  {requestForm.problemSubtype ||
                    (requiresSubtype ? "Not selected" : "Not required")}
                </span>
              </p>
              <p>
                Nearest Point S:{" "}
                <span className="font-semibold text-slate-900">
                  {selectedPos?.name || "Not selected"}
                </span>
              </p>
              <p>
                Date & slot:{" "}
                <span className="font-semibold text-slate-900">
                  {selectedSlot
                    ? `${requestForm.preferredDate}, ${selectedSlot.label}`
                    : "Not selected"}
                </span>
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Policy validation
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${policyStatusClass}`}
                >
                  {policyStatusLabel}
                </span>
                <p className="mt-2 text-xs text-slate-600">
                  {policyValidation.note}
                </p>
              </div>
              {/* <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Estimated baseline</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">${previewCost}</p>
              </div> */}
              <Button
                className="w-full"
                disabled={isSubmittingRequest || !isServiceRequestFormReady}
                onClick={handleSubmitSimpleRequest}
                type="button"
              >
                {isSubmittingRequest ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Book service appointment"
                )}
              </Button>
              {!isSubmittingRequest && !isServiceRequestFormReady ? (
                <p className="text-[11px] text-slate-500 sm:text-xs">
                  Complete the required service details, then choose station,
                  date, and a free slot to enable the request.
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      </section>

      {/* 
        Legacy UI (kept commented for future reuse)
        - Quick service request card
        - Nearest Point S station and slot booking card
        - Optional details + Request check two-column section
        To restore: re-enable previous JSX block from component history (current handlers still compatible).
      */}

      {wizardFeedback ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-700 sm:text-sm">
          {wizardFeedback}
        </div>
      ) : null}

      <div
        className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6"
        id="driver-service-request-details"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            Your service request details
          </h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {driverServiceRequests.length} requests
          </span>
        </div>

        {driverServiceRequests.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No requests yet. Submit one using the quick form above.
          </p>
        ) : (
          <div className="mt-4 grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[340px_1fr]">
            <div className="card-list-scrollbar max-h-[300px] space-y-2 overflow-y-auto pr-1 sm:max-h-[420px] sm:pr-2">
              {driverServiceRequests.map((order) => {
                const isActive = selectedRequest?.id === order.id;
                return (
                  <button
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400"
                    }`}
                    key={order.id}
                    onClick={() => setSelectedRequestId(order.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold sm:text-sm">
                        {order.id}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : requestStatusClass(order.status)
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p
                      className={`mt-1 text-[11px] sm:text-xs ${isActive ? "text-slate-200" : "text-slate-600"}`}
                    >
                      {order.serviceType}
                    </p>
                    <p
                      className={`mt-1 text-[10px] sm:text-xs ${
                        isActive ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {formatDateTime(order.requestedAt)}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              {selectedRequest ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-900 sm:text-base">
                      {selectedRequest.id} - {selectedRequest.requestTitle}
                    </h4>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${requestStatusClass(
                        selectedRequest.status,
                      )}`}
                    >
                      {selectedRequest.status}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2 sm:text-sm">
                    <p>
                      Service type:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.serviceType}
                      </span>
                    </p>
                    <p>
                      Requested at:{" "}
                      <span className="font-semibold text-slate-900">
                        {formatDateTime(selectedRequest.requestedAt)}
                      </span>
                    </p>
                    <p>
                      Priority:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.priority || "Normal"}
                      </span>
                    </p>
                    <p>
                      Emergency:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.emergency ? "Yes" : "No"}
                      </span>
                    </p>
                    <p>
                      Location:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.orderDetails?.location || "N/A"}
                      </span>
                    </p>
                    <p>
                      Appointment:{" "}
                      <span className="font-semibold text-slate-900">
                        {selectedRequest.appointment?.dateTime
                          ? formatDateTime(selectedRequest.appointment.dateTime)
                          : "Not scheduled"}
                      </span>
                    </p>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Description
                    </p>
                    <p className="mt-1 text-xs text-slate-700 sm:text-sm">
                      {selectedRequest.orderDetails?.description || "N/A"}
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Notes
                    </p>
                    <p className="mt-1 text-xs text-slate-700 sm:text-sm">
                      {selectedRequest.orderDetails?.notes || "N/A"}
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Lifecycle
                    </p>
                    <div className="card-list-scrollbar mt-2 max-h-[16rem] space-y-2 overflow-y-auto pr-1">
                      {(selectedRequest.lifecycle || [])
                        .slice()
                        .reverse()
                        .slice(0, 6)
                        .map((entry, index) => (
                          <div
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                            key={`${selectedRequest.id}-timeline-${index}`}
                          >
                            <p className="text-xs font-semibold text-slate-900 sm:text-sm">
                              {entry.stage}
                            </p>
                            <p className="text-[11px] text-slate-500 sm:text-xs">
                              {formatDateTime(entry.time)} by{" "}
                              {entry.actor || "System"}
                            </p>
                            {entry.note ? (
                              <p className="mt-1 text-[11px] text-slate-600 sm:text-xs">
                                {entry.note}
                              </p>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {showAllServices ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-2 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  All services
                </p>
                <p className="text-sm text-slate-500">
                  Select one service to continue
                </p>
              </div>
              <Button
                onClick={() => setShowAllServices(false)}
                type="button"
                variant="outline"
              >
                Close
              </Button>
            </div>
            <div className="card-list-scrollbar mt-4 grid max-h-[60vh] grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3">
              {orderedServiceOptions.map((option) => (
                <ServiceCategoryCard
                  cardKey={`modal-${option.value}`}
                  isSelected={requestForm.problemType === option.value}
                  key={`modal-${option.value}`}
                  onSelect={() =>
                    handleServiceSelect(option.value, {
                      closeModal: true,
                      moveToIndex: 5,
                    })
                  }
                  option={option}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {showAllStations ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-2 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  All nearby Point S stations
                </p>
                {/* <p className="text-sm text-slate-500">
                  Select one Point S station to continue ({filteredStations.length} shown of{" "}
                  {totalStationsCount})
                </p> */}
              </div>
              <Button
                onClick={() => setShowAllStations(false)}
                type="button"
                variant="outline"
              >
                Close
              </Button>
            </div>
            <div className="max-w-sm">
              <div className="relative">
                <Input
                  className="pr-10"
                  onChange={(event) => setStationSearch(event.target.value)}
                  placeholder="Search station, location or capability..."
                  value={stationSearch}
                />
                {stationSearch ? (
                  <button
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    onClick={() => setStationSearch("")}
                    type="button"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
              <div className="mt-1 flex min-h-4 items-center gap-1.5 text-[11px] text-slate-500">
                {isSearchDebouncing ? (
                  <>
                    <Loader2 className="size-3 animate-spin text-sky-600" />
                    <span>Searching stations...</span>
                  </>
                ) : (
                  <span>{filteredStations.length} matching stations</span>
                )}
              </div>
            </div>
            <div
              className="card-list-scrollbar mt-4 grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto pr-1 min-[520px]:grid-cols-2 lg:grid-cols-3"
              onScroll={handleStationModalScroll}
            >
              {isSearchDebouncing ? (
                <div className="col-span-full flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <Loader2 className="mr-2 size-4 animate-spin text-sky-600" />
                  Loading matching stations...
                </div>
              ) : filteredStations.length === 0 ? (
                <p className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                  No stations found for this search.
                </p>
              ) : (
                visibleFilteredStations.map((pos) =>
                  renderStationCard(pos, { closeOnSelect: true }),
                )
              )}
              {isLoadingMoreStations ? (
                <div className="col-span-full flex justify-center pt-1">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                    <Loader2 className="size-3.5 animate-spin text-sky-600" />
                    Loading more stations...
                  </span>
                </div>
              ) : hasMoreFilteredStations ? (
                <div className="col-span-full flex justify-center pt-1">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                    Scroll to load more stations
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default DriverServiceRequestSection;
