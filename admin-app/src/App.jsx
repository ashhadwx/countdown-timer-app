import React, { useState, useEffect, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  DataTable,
  Badge,
  Modal,
  FormLayout,
  Select,
  TextContainer,
  Banner,
  ColorPicker,
} from "@shopify/polaris";
import { useFetch } from "./useFetch";
import { getTimerStatus, toLocalDateAndTime, dateAndTimeToISO, normalizeDateToYYYYMMDD, normalizeTimeToHHmm, hexToHsb, hsbToHex } from "./utils";

export default function App() {
  const [timers, setTimers] = useState([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState(getDefaultFormData());
  const [formErrors, setFormErrors] = useState({});
  const [pickerMode, setPickerMode] = useState(null); // "products" | "collections" | null
  const [pickerSelection, setPickerSelection] = useState([]);
  const [editingTimer, setEditingTimer] = useState(null); // full timer when editing (for analytics display)
  const formContainerRef = React.useRef(null);

  const { data: timersData, loading: timersLoading, error: timersError, refetch: refetchTimers } = useFetch("/api/timers");
  const { data: productsData, loading: productsLoading, error: productsError, fetch: fetchProducts } = useFetch("/api/shop/products", { immediate: false });
  const { data: collectionsData, loading: collectionsLoading, error: collectionsError, fetch: fetchCollections } = useFetch("/api/shop/collections", { immediate: false });

  useEffect(() => {
    if (timersData && Array.isArray(timersData)) setTimers(timersData);
  }, [timersData]);

  const filteredTimers = search.trim()
    ? timers.filter(
        (t) =>
          (t.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (t.promotionDescription || "").toLowerCase().includes(search.toLowerCase())
      )
    : timers;

  const openCreate = () => {
    setEditingId(null);
    setEditingTimer(null);
    setFormData(getDefaultFormData());
    setFormErrors({});
    setFormError("");
    setModalOpen(true);
  };

  const openProductPicker = () => {
    setPickerSelection(formData.productIds);
    setPickerMode("products");
    fetchProducts();
  };
  const openCollectionPicker = () => {
    setPickerSelection(formData.collectionIds);
    setPickerMode("collections");
    fetchCollections();
  };
  const confirmPicker = () => {
    if (pickerMode === "products") setFormData((p) => ({ ...p, productIds: [...pickerSelection] }));
    if (pickerMode === "collections") setFormData((p) => ({ ...p, collectionIds: [...pickerSelection] }));
    setPickerMode(null);
  };
  const togglePickerItem = (id) => {
    setPickerSelection((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const openEdit = (timer) => {
    setEditingId(timer._id);
    setEditingTimer(timer);
    const start = toLocalDateAndTime(timer.startAt);
    const end = toLocalDateAndTime(timer.endAt);
    setFormData({
      name: timer.name || "",
      type: timer.type || "fixed",
      startDate: start.date,
      startTime: start.time,
      endDate: end.date,
      endTime: end.time,
      durationMinutes: timer.type === "evergreen" && timer.durationSeconds ? Math.round(timer.durationSeconds / 60) : 10,
      promotionDescription: timer.promotionDescription || "",
      targetType: timer.targetType || "all",
      productIds: timer.productIds || [],
      collectionIds: timer.collectionIds || [],
      backgroundColor: timer.backgroundColor || "#000000",
      timerSize: timer.timerSize || "medium",
      timerPosition: timer.timerPosition || "top",
      urgencyCue: timer.urgencyCue || "color_pulse",
      urgencyThresholdSeconds: timer.urgencyThresholdSeconds ?? 300,
    });
    setFormErrors({});
    setFormError("");
    setModalOpen(true);
  };

  const validateForm = (dateTimeOverride = {}) => {
    const err = {};
    if (!formData.name.trim()) err.name = "Timer name is required";
    if (formData.type === "fixed") {
      const rawStartDate = dateTimeOverride.startDate ?? formData.startDate;
      const rawEndDate = dateTimeOverride.endDate ?? formData.endDate;
      const rawStartTime = dateTimeOverride.startTime ?? formData.startTime;
      const rawEndTime = dateTimeOverride.endTime ?? formData.endTime;
      const startDateNorm = normalizeDateToYYYYMMDD(rawStartDate);
      const endDateNorm = normalizeDateToYYYYMMDD(rawEndDate);
      const startTimeNorm = normalizeTimeToHHmm(rawStartTime);
      const endTimeNorm = normalizeTimeToHHmm(rawEndTime);
      if (!startDateNorm) err.startDate = "Start date required";
      if (!startTimeNorm) err.startTime = "Start time required";
      if (!endDateNorm) err.endDate = "End date required";
      if (!endTimeNorm) err.endTime = "End time required";
      if (startDateNorm && startTimeNorm && endDateNorm && endTimeNorm) {
        const startMs = new Date(`${startDateNorm}T${startTimeNorm}`).getTime();
        const endMs = new Date(`${endDateNorm}T${endTimeNorm}`).getTime();
        if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) err.endTime = "End must be after start";
      }
    } else {
      const min = Number(formData.durationMinutes);
      if (!Number.isFinite(min) || min < 1) err.durationMinutes = "Duration must be at least 1 minute";
    }
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const getDateTimeFromDOM = () => {
    const v = (node) => (node?.value ?? "").trim();
    const fromRoot = (root) => {
      if (!root) return null;
      const dateInputs = root.querySelectorAll('input[type="date"]');
      const timeInputs = root.querySelectorAll('input[type="time"]');
      if (dateInputs.length < 2 || timeInputs.length < 2) return null;
      return {
        startDate: normalizeDateToYYYYMMDD(v(dateInputs[0])) || v(dateInputs[0]) || formData.startDate,
        startTime: normalizeTimeToHHmm(v(timeInputs[0])) || v(timeInputs[0]) || formData.startTime,
        endDate: normalizeDateToYYYYMMDD(v(dateInputs[1])) || v(dateInputs[1]) || formData.endDate,
        endTime: normalizeTimeToHHmm(v(timeInputs[1])) || v(timeInputs[1]) || formData.endTime,
      };
    };
    const fromRef = fromRoot(formContainerRef.current);
    if (fromRef) return fromRef;
    const dialogs = document.querySelectorAll('[role="dialog"]');
    for (const dialog of dialogs) {
      const fromDialog = fromRoot(dialog);
      if (fromDialog) return fromDialog;
    }
    return {
      startDate: formData.startDate,
      startTime: formData.startTime,
      endDate: formData.endDate,
      endTime: formData.endTime,
    };
  };

  const handleSubmit = async () => {
    setFormError("");
    if (formData.type === "fixed") {
      document.activeElement?.blur?.();
      await new Promise((r) => setTimeout(r, 50));
    }
    const dt = formData.type === "fixed" ? getDateTimeFromDOM() : {};
    if (!validateForm(dt)) return;
    const payload = {
      name: formData.name.trim(),
      type: formData.type,
      promotionDescription: formData.promotionDescription.trim(),
      targetType: formData.targetType,
      productIds: formData.productIds,
      collectionIds: formData.collectionIds,
      backgroundColor: formData.backgroundColor,
      timerSize: formData.timerSize,
      timerPosition: formData.timerPosition,
      urgencyCue: formData.urgencyCue,
      urgencyThresholdSeconds: formData.urgencyThresholdSeconds ?? 300,
    };
    if (formData.type === "fixed") {
      const startDate = dt.startDate || formData.startDate;
      const startTime = dt.startTime || formData.startTime;
      const endDate = dt.endDate || formData.endDate;
      const endTime = dt.endTime || formData.endTime;
      payload.startAt = dateAndTimeToISO(startDate, startTime);
      payload.endAt = dateAndTimeToISO(endDate, endTime);
    } else {
      payload.durationSeconds = Math.max(1, Math.round(Number(formData.durationMinutes) * 60));
    }
    try {
      const url = editingId ? `/api/timers/${editingId}` : "/api/timers";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error || "Request failed");
        return;
      }
      setModalOpen(false);
      refetchTimers();
    } catch (e) {
      setFormError(e.message || "Request failed");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this timer?")) return;
    try {
      const res = await fetch(`/api/timers/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok || res.status === 204) {
        refetchTimers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const rows = filteredTimers.map((t) => {
    const status = getTimerStatus(t);
    return [
      t.name,
      (t.promotionDescription || "").slice(0, 40) + ((t.promotionDescription || "").length > 40 ? "…" : ""),
      t.type === "evergreen" ? "Evergreen" : t.startAt ? new Date(t.startAt).toLocaleString() : "—",
      <Badge key={t._id} tone={status === "active" ? "success" : status === "scheduled" ? "attention" : "critical"}>{status}</Badge>,
      String(t.impressionCount ?? 0),
      <div key={t._id} style={{ display: "flex", gap: "8px" }}>
        <Button size="slim" onClick={() => openEdit(t)}>Edit</Button>
        <Button size="slim" tone="critical" onClick={() => handleDelete(t._id)}>Delete</Button>
      </div>,
    ];
  });

  return (
    <>
      <Page
        title="Countdown Timer Manager"
        subtitle="Create and manage countdown timers for your promotions."
        primaryAction={{ content: "Create timer", onAction: openCreate }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <TextField
                label="Search timers"
                labelHidden
                placeholder="Search timers"
                value={search}
                onChange={setSearch}
                autoComplete="off"
              />
              {timersError && (
                <Banner tone="critical" onDismiss={() => {}}>
                  {timersError}
                </Banner>
              )}
              {timersLoading ? (
                <TextContainer>Loading timers…</TextContainer>
              ) : (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "numeric", "text"]}
                  headings={["Name", "Description", "Start / Type", "Status", "Impressions", "Actions"]}
                  rows={rows}
                />
              )}
            </Card>
          </Layout.Section>
        </Layout>
      </Page>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Timer" : "Create New Timer"}
        primaryAction={{
          content: editingId ? "Save" : "Create timer",
          onAction: handleSubmit,
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setModalOpen(false) }]}
      >
        <Modal.Section>
          <div ref={formContainerRef}>
          {formError && (
            <Banner tone="critical" onDismiss={() => setFormError("")}>
              {formError}
            </Banner>
          )}
          <FormLayout>
            <TextField
              label="Timer name"
              placeholder="Enter timer name."
              value={formData.name}
              onChange={(v) => setFormData((p) => ({ ...p, name: v }))}
              error={formErrors.name}
              requiredIndicator
            />
            <Select
              label="Timer type"
              options={[
                { label: "Fixed (start/end date)", value: "fixed" },
                { label: "Evergreen (session-based)", value: "evergreen" },
              ]}
              value={formData.type}
              onChange={(v) => setFormData((p) => ({ ...p, type: v }))}
            />
            {formData.type === "fixed" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <TextField
                    id="timer-start-date"
                    type="date"
                    label="Start date"
                    value={formData.startDate}
                    onChange={(v) =>
                      setFormData((p) => ({ ...p, startDate: normalizeDateToYYYYMMDD(v) || v }))
                    }
                    onBlur={(e) => {
                      const v = e?.target?.value;
                      if (v != null && v !== formData.startDate) {
                        setFormData((p) => ({ ...p, startDate: normalizeDateToYYYYMMDD(v) || v }));
                      }
                    }}
                    error={formErrors.startDate}
                    autoComplete="off"
                  />
                  <TextField
                    id="timer-start-time"
                    type="time"
                    label="Start time"
                    value={formData.startTime}
                    onChange={(v) =>
                      setFormData((p) => ({ ...p, startTime: normalizeTimeToHHmm(v) || v }))
                    }
                    onBlur={(e) => {
                      const v = e?.target?.value;
                      if (v != null && v !== formData.startTime) {
                        setFormData((p) => ({ ...p, startTime: normalizeTimeToHHmm(v) || v }));
                      }
                    }}
                    error={formErrors.startTime}
                    autoComplete="off"
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <TextField
                    id="timer-end-date"
                    type="date"
                    label="End date"
                    value={formData.endDate}
                    onChange={(v) =>
                      setFormData((p) => ({ ...p, endDate: normalizeDateToYYYYMMDD(v) || v }))
                    }
                    onBlur={(e) => {
                      const v = e?.target?.value;
                      if (v != null && v !== formData.endDate) {
                        setFormData((p) => ({ ...p, endDate: normalizeDateToYYYYMMDD(v) || v }));
                      }
                    }}
                    error={formErrors.endDate}
                    autoComplete="off"
                  />
                  <TextField
                    id="timer-end-time"
                    type="time"
                    label="End time"
                    value={formData.endTime}
                    onChange={(v) =>
                      setFormData((p) => ({ ...p, endTime: normalizeTimeToHHmm(v) || v }))
                    }
                    onBlur={(e) => {
                      const v = e?.target?.value;
                      if (v != null && v !== formData.endTime) {
                        setFormData((p) => ({ ...p, endTime: normalizeTimeToHHmm(v) || v }));
                      }
                    }}
                    error={formErrors.endTime}
                    autoComplete="off"
                  />
                </div>
              </>
            )}
            {formData.type === "evergreen" && (
              <TextField
                type="number"
                label="Duration (minutes)"
                value={String(formData.durationMinutes)}
                onChange={(v) => setFormData((p) => ({ ...p, durationMinutes: v }))}
                error={formErrors.durationMinutes}
                min={1}
                autoComplete="off"
              />
            )}
            <TextField
              label="Promotion description"
              placeholder="Enter promotion details."
              value={formData.promotionDescription}
              onChange={(v) => setFormData((p) => ({ ...p, promotionDescription: v }))}
              multiline={3}
            />
            <Select
              label="Apply to"
              options={[
                { label: "All products", value: "all" },
                { label: "Specific products", value: "products" },
                { label: "Specific collections", value: "collections" },
              ]}
              value={formData.targetType}
              onChange={(v) => setFormData((p) => ({ ...p, targetType: v }))}
            />
            {formData.targetType === "products" && (
              <>
                <Button onClick={openProductPicker}>
                  {formData.productIds.length ? `${formData.productIds.length} product(s) selected` : "Select products"}
                </Button>
              </>
            )}
            {formData.targetType === "collections" && (
              <>
                <Button onClick={openCollectionPicker}>
                  {formData.collectionIds.length ? `${formData.collectionIds.length} collection(s) selected` : "Select collections"}
                </Button>
              </>
            )}
            <div>
              <TextContainer as="p" variant="bodyMd" fontWeight="medium">
                Background color
              </TextContainer>
              <div style={{ marginTop: 8 }}>
                <ColorPicker
                  color={hexToHsb(formData.backgroundColor)}
                  onChange={(c) =>
                    setFormData((p) => ({
                      ...p,
                      backgroundColor: hsbToHex(c.hue, c.saturation, c.brightness),
                    }))
                  }
                  fullWidth
                />
              </div>
            </div>
            <Select
              label="Timer size"
              options={[
                { label: "Small", value: "small" },
                { label: "Medium", value: "medium" },
                { label: "Large", value: "large" },
              ]}
              value={formData.timerSize}
              onChange={(v) => setFormData((p) => ({ ...p, timerSize: v }))}
            />
            <Select
              label="Timer position"
              options={[
                { label: "Top", value: "top" },
                { label: "Bottom", value: "bottom" },
                { label: "Custom", value: "custom" },
              ]}
              value={formData.timerPosition}
              onChange={(v) => setFormData((p) => ({ ...p, timerPosition: v }))}
            />
            <Select
              label="Urgency notification"
              options={[
                { label: "Color pulse", value: "color_pulse" },
                { label: "None", value: "none" },
              ]}
              value={formData.urgencyCue}
              onChange={(v) => setFormData((p) => ({ ...p, urgencyCue: v }))}
            />
            {formData.urgencyCue === "color_pulse" && (
              <Select
                label="Urgency threshold"
                options={[
                  { label: "Last 5 minutes", value: "300" },
                  { label: "Last 60 seconds", value: "60" },
                ]}
                value={String(formData.urgencyThresholdSeconds ?? 300)}
                onChange={(v) => setFormData((p) => ({ ...p, urgencyThresholdSeconds: Number(v) }))}
              />
            )}
            {editingId && editingTimer != null && (
              <Card sectioned title="Analytics">
                <TextContainer>
                  <p><strong>Total impressions:</strong> {editingTimer.impressionCount ?? 0}</p>
                  <p style={{ marginTop: 4, color: "#6d7175", fontSize: "12px" }}>Number of times this timer was shown on the storefront.</p>
                </TextContainer>
              </Card>
            )}
          </FormLayout>
          </div>
        </Modal.Section>
      </Modal>

      {pickerMode && (
        <Modal
          open={!!pickerMode}
          onClose={() => setPickerMode(null)}
          title={pickerMode === "products" ? "Select products" : "Select collections"}
          primaryAction={{ content: "Confirm", onAction: confirmPicker }}
          secondaryActions={[{ content: "Cancel", onAction: () => setPickerMode(null) }]}
        >
          <Modal.Section>
            {pickerMode === "products" && (productsLoading ? (
              <TextContainer>Loading products…</TextContainer>
            ) : productsError ? (
              <Banner status="critical" onDismiss={() => {}}>
                Could not load products. Reinstall the app to grant product access, then try again.
              </Banner>
            ) : (
              <div style={{ maxHeight: 300, overflow: "auto" }}>
                {(Array.isArray(productsData) ? productsData : []).map((p) => (
                  <div key={p.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={pickerSelection.includes(p.id)}
                        onChange={() => togglePickerItem(p.id)}
                      />
                      <span>{p.title || p.id}</span>
                    </label>
                  </div>
                ))}
              </div>
            ))}
            {pickerMode === "collections" && (collectionsLoading ? (
              <TextContainer>Loading collections…</TextContainer>
            ) : collectionsError ? (
              <Banner status="critical" onDismiss={() => {}}>
                Could not load collections. Reinstall the app to grant collection access, then try again.
              </Banner>
            ) : (
              <div style={{ maxHeight: 300, overflow: "auto" }}>
                {(Array.isArray(collectionsData) ? collectionsData : []).map((c) => (
                  <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={pickerSelection.includes(c.id)}
                        onChange={() => togglePickerItem(c.id)}
                      />
                      <span>{c.title || c.id}</span>
                    </label>
                  </div>
                ))}
              </div>
            ))}
          </Modal.Section>
        </Modal>
      )}
    </>
  );
}

function getDefaultFormData() {
  return {
    name: "",
    type: "fixed",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    durationMinutes: 10,
    promotionDescription: "",
    targetType: "all",
    productIds: [],
    collectionIds: [],
    backgroundColor: "#000000",
    timerSize: "medium",
    timerPosition: "top",
    urgencyCue: "color_pulse",
    urgencyThresholdSeconds: 300,
  };
}
