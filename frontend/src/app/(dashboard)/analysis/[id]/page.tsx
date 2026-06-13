export const dynamicParams = false;
export async function generateStaticParams() { return [{ id: "demo" }]; }

import { AnalysisClient } from "./AnalysisClient";

export default function AnalysisPage() {
  return <AnalysisClient />;
}
