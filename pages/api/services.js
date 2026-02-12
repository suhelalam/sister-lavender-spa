import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const snapshot = await getDocs(collection(db, "services"));

    const data = snapshot.docs
      .map((serviceDoc) => ({
        id: serviceDoc.id,
        ...serviceDoc.data(),
      }))
      .sort((a, b) => {
        const categoryCompare = (a.category || "").localeCompare(b.category || "");
        if (categoryCompare !== 0) return categoryCompare;
        return (a.name || "").localeCompare(b.name || "");
      });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching Firestore services:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
