import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useRouter } from "next/router";
import { defaultHomeSettings } from "../../lib/homeSettings";
import { useServices } from "../../context/ServicesContext";

const emptyBlock = () => ({
  date: "",
  startTime: "09:30",
  endTime: "10:30",
  scope: "all",
  serviceIds: [],
  categories: [],
  note: "",
});

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessHours, setBusinessHours] = useState(defaultHomeSettings.businessHours);
  const [announcements, setAnnouncements] = useState(defaultHomeSettings.announcements);
  const [promotion, setPromotion] = useState(defaultHomeSettings.promotion);
  const [timeBlocks, setTimeBlocks] = useState([]);
  const [blockForm, setBlockForm] = useState(emptyBlock);
  const { services } = useServices();
  const bookableServices = services.filter((service) => !service.isAddOn && service.isActive !== false);
  const serviceCategories = [...new Set(bookableServices.map((service) => service.category).filter(Boolean))].sort();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (loadingAuth) return;

    const loadSettings = async () => {
      setLoadingData(true);
      try {
        const response = await fetch("/api/admin/settings");
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        setBusinessHours(payload?.settings?.businessHours || defaultHomeSettings.businessHours);
        setAnnouncements(payload?.settings?.announcements || defaultHomeSettings.announcements);
        setPromotion(payload?.settings?.promotion || defaultHomeSettings.promotion);
        setTimeBlocks(payload?.settings?.timeBlocks || []);
      } catch (error) {
        console.error("Failed to load settings:", error);
        alert(`Failed to load settings: ${error.message || String(error)}`);
      } finally {
        setLoadingData(false);
      }
    };

    loadSettings();
  }, [loadingAuth]);

  const updateHour = (index, key, value) => {
    setBusinessHours((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [key]: value } : entry))
    );
  };

  const updateAnnouncement = (index, key, value) => {
    setAnnouncements((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [key]: value } : entry))
    );
  };

  const addAnnouncement = () => {
    setAnnouncements((prev) => [
      ...prev,
      {
        id: `announcement-${Date.now()}`,
        title: "",
        date: "",
        description: "",
        note: "",
      },
    ]);
  };

  const removeAnnouncement = (index) => {
    setAnnouncements((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleBlockService = (serviceId) => {
    setBlockForm((current) => ({
      ...current,
      serviceIds: current.serviceIds.includes(serviceId)
        ? current.serviceIds.filter((id) => id !== serviceId)
        : [...current.serviceIds, serviceId],
    }));
  };

  const toggleBlockCategory = (category) => {
    setBlockForm((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }));
  };

  const addTimeBlock = () => {
    if (!blockForm.date || !blockForm.startTime || !blockForm.endTime) {
      alert("Choose a date, start time, and end time.");
      return;
    }
    if (blockForm.startTime >= blockForm.endTime) {
      alert("End time must be after start time.");
      return;
    }
    if (blockForm.scope === "services" && blockForm.serviceIds.length === 0) {
      alert("Select at least one service.");
      return;
    }
    if (blockForm.scope === "categories" && blockForm.categories.length === 0) {
      alert("Select at least one category.");
      return;
    }

    setTimeBlocks((current) => [
      ...current,
      {
        ...blockForm,
        id: `block-${Date.now()}`,
        variationIds: bookableServices
          .filter((service) => blockForm.serviceIds.includes(service.id))
          .flatMap((service) => (service.variations || []).map((variation) => variation.id)),
      },
    ].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)));
    setBlockForm(emptyBlock());
  };

  const serviceNamesForBlock = (block) =>
    block.serviceIds
      .map((id) => bookableServices.find((service) => service.id === id)?.name)
      .filter(Boolean)
      .join(", ");

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessHours, announcements, promotion, timeBlocks }),
      });

      if (!response.ok) throw new Error(await response.text());
      alert("Settings updated.");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert(`Failed to save settings: ${error.message || String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  if (loadingAuth) return <p className="text-center mt-10">Checking authentication...</p>;
  if (loadingData) return <p className="text-center mt-10">Loading settings...</p>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Settings</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/admin")}
            className="bg-gray-200 px-3 py-1 rounded text-sm"
          >
            Back to Admin
          </button>
          <button
            onClick={() => auth.signOut().then(() => router.push("/login"))}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">Blocked Times</h2>
            <p className="mt-1 text-sm text-gray-500">
              Hide a timeframe from every service, or only from the services you choose.
            </p>
          </div>

          <div className="rounded-lg border border-purple-100 bg-purple-50/40 p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <label>
                <span className="label">Date</span>
                <input type="date" className="field" value={blockForm.date} onChange={(e) => setBlockForm((current) => ({ ...current, date: e.target.value }))} />
              </label>
              <label>
                <span className="label">From</span>
                <input type="time" className="field" value={blockForm.startTime} onChange={(e) => setBlockForm((current) => ({ ...current, startTime: e.target.value }))} />
              </label>
              <label>
                <span className="label">Until</span>
                <input type="time" className="field" value={blockForm.endTime} onChange={(e) => setBlockForm((current) => ({ ...current, endTime: e.target.value }))} />
              </label>
            </div>

            <fieldset className="mt-4">
              <legend className="text-sm font-semibold text-gray-800">Apply to</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  ["all", "All services"],
                  ["categories", "Whole categories"],
                  ["services", "Selected services"],
                ].map(([value, label]) => (
                  <label key={value} className={`cursor-pointer rounded-full border px-4 py-2 text-sm ${blockForm.scope === value ? "border-purple-600 bg-purple-600 text-white" : "border-gray-300 bg-white text-gray-700"}`}>
                    <input type="radio" className="sr-only" name="block-scope" value={value} checked={blockForm.scope === value} onChange={() => setBlockForm((current) => ({ ...current, scope: value }))} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {blockForm.scope === "services" && (
              <fieldset className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
                <legend className="px-1 text-sm font-semibold">Choose services</legend>
                <div className="mt-1 grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">
                  {bookableServices.map((service) => (
                    <label key={service.id} className="flex items-start gap-2 rounded p-2 text-sm hover:bg-gray-50">
                      <input type="checkbox" className="mt-1" checked={blockForm.serviceIds.includes(service.id)} onChange={() => toggleBlockService(service.id)} />
                      <span><span className="font-medium">{service.name}</span><span className="block text-xs text-gray-500">{service.category}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {blockForm.scope === "categories" && (
              <fieldset className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
                <legend className="px-1 text-sm font-semibold">Choose categories</legend>
                <div className="mt-1 grid gap-2 sm:grid-cols-2">
                  {serviceCategories.map((category) => (
                    <label key={category} className="flex items-center gap-2 rounded p-2 text-sm hover:bg-gray-50">
                      <input type="checkbox" checked={blockForm.categories.includes(category)} onChange={() => toggleBlockCategory(category)} />
                      <span className="font-medium">{category}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label>
                <span className="label">Note <span className="font-normal text-gray-400">(optional)</span></span>
                <input className="field" maxLength={120} placeholder="Lunch, training, private event…" value={blockForm.note} onChange={(e) => setBlockForm((current) => ({ ...current, note: e.target.value }))} />
              </label>
              <button type="button" onClick={addTimeBlock} className="rounded bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">
                Add blocked time
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {timeBlocks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500">No blocked times scheduled.</p>
            ) : timeBlocks.map((block) => (
              <div key={block.id} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{new Date(`${block.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} · {block.startTime}–{block.endTime}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {block.scope === "all"
                      ? "All services"
                      : block.scope === "categories"
                        ? block.categories.join(", ") || "Selected categories"
                        : serviceNamesForBlock(block) || "Selected services"}
                    {block.note ? ` · ${block.note}` : ""}
                  </p>
                </div>
                <button type="button" onClick={() => setTimeBlocks((current) => current.filter((item) => item.id !== block.id))} className="self-start text-sm font-semibold text-red-600 hover:underline sm:self-auto">Remove</button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">Use Save Settings below to publish added or removed blocks.</p>
        </section>

        <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Business Hours</h2>
          <div className="space-y-3">
            {businessHours.map((entry, index) => (
              <div key={entry.day} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                <div className="font-medium">{entry.day}</div>
                <input
                  type="time"
                  value={entry.open}
                  disabled={entry.closed}
                  onChange={(e) => updateHour(index, "open", e.target.value)}
                  className="p-2 border rounded"
                />
                <input
                  type="time"
                  value={entry.close}
                  disabled={entry.closed}
                  onChange={(e) => updateHour(index, "close", e.target.value)}
                  className="p-2 border rounded"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={entry.closed}
                    onChange={(e) => updateHour(index, "closed", e.target.checked)}
                  />
                  Closed
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Promotion Pop-Up</h2><p className="text-sm text-gray-500">Schedule the offer shown to public-site visitors.</p></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={promotion.enabled} onChange={(e)=>setPromotion(p=>({...p,enabled:e.target.checked}))}/> Enabled</label></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label><span className="label">Title</span><input className="field" value={promotion.title} onChange={(e)=>setPromotion(p=>({...p,title:e.target.value}))}/></label>
            <label><span className="label">Description</span><input className="field" value={promotion.description} onChange={(e)=>setPromotion(p=>({...p,description:e.target.value}))}/></label>
            <label><span className="label">Start date</span><input type="date" className="field" value={promotion.startDate} onChange={(e)=>setPromotion(p=>({...p,startDate:e.target.value}))}/></label>
            <label><span className="label">End date</span><input type="date" className="field" value={promotion.endDate} onChange={(e)=>setPromotion(p=>({...p,endDate:e.target.value}))}/></label>
            <label className="md:col-span-2"><span className="label">Terms</span><textarea className="field" rows={2} value={promotion.terms} onChange={(e)=>setPromotion(p=>({...p,terms:e.target.value}))}/></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={promotion.showOnce} onChange={(e)=>setPromotion(p=>({...p,showOnce:e.target.checked}))}/> Show only once per visitor</label>
          </div>
        </section>

        <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Latest News & Announcements</h2>
            <button
              onClick={addAnnouncement}
              className="bg-purple-600 text-white px-3 py-1 rounded text-sm"
            >
              Add Announcement
            </button>
          </div>

          <div className="space-y-4">
            {announcements.map((item, index) => (
              <div key={item.id || index} className="border rounded p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Announcement {index + 1}</h3>
                  <button
                    onClick={() => removeAnnouncement(index)}
                    className="text-red-600 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateAnnouncement(index, "title", e.target.value)}
                  placeholder="Title"
                  className="w-full p-2 border rounded"
                />
                <input
                  type="text"
                  value={item.date}
                  onChange={(e) => updateAnnouncement(index, "date", e.target.value)}
                  placeholder="Date range"
                  className="w-full p-2 border rounded"
                />
                <textarea
                  value={item.description}
                  onChange={(e) => updateAnnouncement(index, "description", e.target.value)}
                  placeholder="Description"
                  className="w-full p-2 border rounded"
                  rows={3}
                />
                <textarea
                  value={item.note}
                  onChange={(e) => updateAnnouncement(index, "note", e.target.value)}
                  placeholder="Optional note"
                  className="w-full p-2 border rounded"
                  rows={2}
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="bg-green-600 text-white px-5 py-2 rounded disabled:bg-gray-400"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
