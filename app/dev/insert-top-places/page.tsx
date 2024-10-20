"use client";

import { useState } from "react";
import { insertTopPlaces } from "@/actions/supabase/private/actions";
import { topPlaces } from "@/actions/supabase/private/data";

export default function InsertTopPlaces() {
  const [result, setResult] = useState("");

  const handleInsert = async () => {
    try {
      await insertTopPlaces(topPlaces);
      setResult("Top places inserted successfully");
    } catch (error) {
      console.error("Error:", error);
      setResult("An error occurred while inserting top places");
    }
  };

  return (
    <div>
      <h1>Insert Top Places</h1>
      <button onClick={handleInsert}>Insert Top Places</button>
      {result && <p>{result}</p>}
    </div>
  );
}
