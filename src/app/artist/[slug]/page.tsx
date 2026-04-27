export async function generateStaticParams() {
  return [{ slug: "placeholder" }];
}
import ArtistClientPage from "./_client";
export default function Page() {
  return <ArtistClientPage />;
}
