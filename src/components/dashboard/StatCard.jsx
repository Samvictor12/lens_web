import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CiAirportSign1 } from "react-icons/ci";

export const StatCard = ({
  title,
  value,
  icon,
  trend,
  className,
}) => {
  const cardClasses = "shadow-sm hover:shadow-md transition-shadow";
  const finalCardClasses = className ? `${cardClasses} ${className}` : cardClasses;
  
  const trendClasses = trend?.isPositive ? "text-xs mt-0.5 text-success" : "text-xs mt-0.5 text-destructive";
  
  return (
    <Card className={finalCardClasses}>
      <CardHeader className="flex flex-row pb-1.5 p-3">
        <CardTitle className="text-xs font-medium text-muted-foreground w-fit">
          {title}
        </CardTitle>
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <CiAirportSign1 className="h-3.5 w-3.5" />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="text-lg sm:text-xl font-bold text-foreground">{value}</div>
        {trend && (
          <p className={trendClasses}>
            {trend.isPositive ? "↑" : "↓"} {trend.value}
          </p>
        )}
      </CardContent>
    </Card>
  );
};




