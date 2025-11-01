import * as React from "react";

const Table = React.forwardRef(
  ({ className, ...props }, ref) => {
    const tableClasses = "w-full caption-bottom text-sm";
    const finalClasses = className ? `${tableClasses} ${className}` : tableClasses;
    
    return (
      <div className="relative w-full overflow-auto">
        <table
          ref={ref}
          className={finalClasses}
          {...props}
        />
      </div>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef(
  ({ className, ...props }, ref) => {
    const headerClasses = "[&_tr]:border-b";
    const finalClasses = className ? `${headerClasses} ${className}` : headerClasses;
    
    return (
      <thead ref={ref} className={finalClasses} {...props} />
    );
  },
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef(
  ({ className, ...props }, ref) => {
    const bodyClasses = "[&_tr:last-child]:border-0";
    const finalClasses = className ? `${bodyClasses} ${className}` : bodyClasses;
    
    return (
      <tbody
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  },
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef(
  ({ className, ...props }, ref) => {
    const footerClasses = "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0";
    const finalClasses = className ? `${footerClasses} ${className}` : footerClasses;
    
    return (
      <tfoot
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  },
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef(
  ({ className, ...props }, ref) => {
    const rowClasses = "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted";
    const finalClasses = className ? `${rowClasses} ${className}` : rowClasses;
    
    return (
      <tr
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  },
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef(
  ({ className, ...props }, ref) => {
    const headClasses = "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0";
    const finalClasses = className ? `${headClasses} ${className}` : headClasses;
    
    return (
      <th
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  },
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef(
  ({ className, ...props }, ref) => {
    const cellClasses = "p-4 align-middle [&:has([role=checkbox])]:pr-0";
    const finalClasses = className ? `${cellClasses} ${className}` : cellClasses;
    
    return (
      <td
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  },
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef(
  ({ className, ...props }, ref) => {
    const captionClasses = "mt-4 text-sm text-muted-foreground";
    const finalClasses = className ? `${captionClasses} ${className}` : captionClasses;
    
    return (
      <caption
        ref={ref}
        className={finalClasses}
        {...props}
      />
    );
  },
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };



