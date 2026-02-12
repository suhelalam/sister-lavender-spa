import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useRouter } from "next/router";
import { defaultHomeSettings } from "../../lib/homeSettings";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessHours, setBusinessHours] = useState(defaultHomeSettings.businessHours);
  const [announcements, setAnnouncements] = useState(defaultHomeSettings.announcements);

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

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessHours, announcements }),
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

