import { Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { offerTypeBadgeVariant, offerTypeLabel } from "./LensOffers.constants";

/**
 * Custom hook returning table columns for the Lens Offers list
 */
export const useLensOffersColumns = (navigate, onDelete) => {
  return [
    {
      accessorKey: "offerName",
      header: "Offer Name",
      sortable: true,
      cell: (offer) => (
        <a
          href={`/masters/lens-offers/view/${offer.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/masters/lens-offers/view/${offer.id}`);
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <div>
            <div className="font-medium text-xs text-primary">{offer.offerName}</div>
            {offer.description && (
              <div className="text-[10px] text-muted-foreground line-clamp-1">
                {offer.description}
              </div>
            )}
          </div>
        </a>
      ),
    },
    {
      accessorKey: "offerType",
      header: "Type",
      sortable: true,
      cell: (offer) => (
        <Badge variant={offerTypeBadgeVariant[offer.offerType] || "secondary"} className="text-xs">
          {offerTypeLabel[offer.offerType] || offer.offerType}
        </Badge>
      ),
    },
    {
      accessorKey: "discount",
      header: "Discount / Price",
      sortable: false,
      cell: (offer) => {
        if (offer.offerType === "VALUE") {
          return <span className="text-xs font-medium">₹{parseFloat(offer.discountValue || 0).toFixed(2)} off</span>;
        }
        if (offer.offerType === "PERCENTAGE") {
          return <span className="text-xs font-medium">{offer.discountPercentage}% off</span>;
        }
        if (offer.offerType === "EXCHANGE_PRODUCT") {
          return <span className="text-xs font-medium">₹{parseFloat(offer.offerPrice || 0).toFixed(2)}</span>;
        }
        return <span className="text-xs">-</span>;
      },
    },
    {
      accessorKey: "filters",
      header: "Applies To",
      sortable: false,
      cell: (offer) => {
        const parts = [];
        if (offer.lensProduct) parts.push(offer.lensProduct.lens_name);
        if (offer.coating) parts.push(offer.coating.name);
        return (
          <span className="text-xs text-muted-foreground">
            {parts.length > 0 ? parts.join(" + ") : "All products"}
          </span>
        );
      },
    },
    {
      accessorKey: "validity",
      header: "Validity",
      sortable: false,
      cell: (offer) => {
        const now = new Date();
        const start = new Date(offer.startDate);
        const end = new Date(offer.endDate);
        const isActive = offer.activeStatus && start <= now && end >= now;

        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Calendar className="h-2.5 w-2.5" />
              {new Date(offer.startDate).toLocaleDateString("en-IN")} –{" "}
              {new Date(offer.endDate).toLocaleDateString("en-IN")}
            </div>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className="text-[10px] w-fit px-1.5 py-0"
            >
              {isActive ? "Live" : end < now ? "Expired" : "Upcoming"}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "activeStatus",
      header: "Status",
      sortable: true,
      cell: (offer) => (
        <Badge variant={offer.activeStatus ? "default" : "secondary"} className="text-xs">
          {offer.activeStatus ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (offer) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete && onDelete(offer)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
