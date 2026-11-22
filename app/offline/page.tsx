import { PageTitle } from "@/components/layout/PageTitle";

/** Served by the service worker when navigation fails offline (§17.8). */
export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-5xl" aria-hidden>
        📶
      </p>
      <PageTitle k="common.offline" />
    </div>
  );
}
