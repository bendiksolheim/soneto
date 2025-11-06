import { ArrowDownCircleIcon, ShareIcon } from "@/icons";
import { Button } from "./base";
import { Point } from "@/lib/map/point";
import { generateShareUrl } from "@/lib/route-url";
import { toast } from "sonner";
import { directionsToGeoJson } from "@/lib/map/directions-to-geojson";
import { exportGpx } from "@/lib/map/gpx";
import { Directions } from "@/lib/mapbox";

type ShareProps = {
  points: Array<Point>;
  directions: Array<Directions>;
};

export function Share(props: ShareProps) {
  const handleShare = async () => {
    try {
      const shareUrl = generateShareUrl(props.points);

      // Copy to clipboard using modern Clipboard API
      await navigator.clipboard.writeText(shareUrl);

      toast.success("Delbar lenke kopiert til utklippstavlen", {
        description: "Send lenken til andre for å dele løypen",
      });
    } catch (error) {
      console.error("Failed to copy share URL:", error);

      // Fallback toast message if clipboard fails
      toast.error("Kunne ikke kopiere til utklippstavlen", {
        description: "Prøv igjen eller bruk en annen nettleser",
      });
    }
  };

  const handleExport = () => {
    const geojson = directionsToGeoJson(props.directions);
    exportGpx(geojson);
  };
  return (
    <div className="flex gap-2">
      <div className="tooltip" data-tip="Eksporter GPX">
        <Button circle size="md" variant="secondary" onClick={handleExport}>
          <ArrowDownCircleIcon size={20} />
        </Button>
      </div>
      <div className="tooltip" data-tip="Del med en venn">
        <Button circle size="md" variant="secondary" onClick={handleShare}>
          <ShareIcon size={20} />
        </Button>
      </div>
    </div>
  );
}
