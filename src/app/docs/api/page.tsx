import Link from "next/link";

export default function ApiDocsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-serif text-3xl text-stone-900">API Documentation</h1>
      <p className="mt-2 text-sm text-stone-600">Gessa provides a REST API for programmatic access to your artworks and transformations.</p>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-3">Authentication</h2>
          <p className="text-sm text-stone-600">All API requests require an API key passed in the Authorization header:</p>
          <pre className="mt-2 rounded-sm bg-stone-100 p-3 text-xs text-stone-700 overflow-x-auto">
            Authorization: Bearer gk_live_xxxxxxxx
          </pre>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-3">Endpoints</h2>
          
          <div className="space-y-4">
            <div className="rounded-sm border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-sm bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">GET</span>
                <code className="text-sm text-stone-900">/quota</code>
              </div>
              <p className="mt-2 text-sm text-stone-600">Check your current quota and usage.</p>
            </div>

            <div className="rounded-sm border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-sm bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">GET</span>
                <code className="text-sm text-stone-900">/artworks</code>
              </div>
              <p className="mt-2 text-sm text-stone-600">List all your artworks.</p>
            </div>

            <div className="rounded-sm border border-stone-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-sm bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">POST</span>
                <code className="text-sm text-stone-900">/transform</code>
              </div>
              <p className="mt-2 text-sm text-stone-600">Transform an artwork image. Requires <code>image_url</code> in request body.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-serif text-xl text-stone-900 mb-3">Example</h2>
          <pre className="rounded-sm bg-stone-100 p-3 text-xs text-stone-700 overflow-x-auto">
{`curl -X POST https://gessa.art/functions/v1/agent-api/transform \\
  -H "Authorization: Bearer gk_live_xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"image_url": "https://example.com/artwork.jpg"}'`}
          </pre>
        </section>
      </div>

      <div className="mt-8">
        <Link href="/dashboard" className="text-sm text-stone-600 hover:text-stone-900 underline">
          Manage your API keys in the dashboard →
        </Link>
      </div>
    </div>
  );
}
