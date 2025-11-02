import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CiAirportSign1 } from "react-icons/ci";

export const StatCard = ({
  title,
  value,
  icon,
  trend,
  className,
}) => {
  const cardClasses = "shadow-card hover:shadow-md transition-shadow";
  const finalCardClasses = className ? `${cardClasses} ${className}` : cardClasses;
  
  const trendClasses = trend?.isPositive ? "text-xs mt-1 text-success" : "text-xs mt-1 text-destructive";
  
  return (
    <Card className={finalCardClasses}>
      <CardHeader className="flex flex-row pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground w-fit">
          {title}
        </CardTitle>
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <CiAirportSign1 />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {trend && (
          <p className={trendClasses}>
            {trend.isPositive ? "↑" : "↓"} {trend.value}
          </p>
        )}
      </CardContent>
    </Card>
  );
};




