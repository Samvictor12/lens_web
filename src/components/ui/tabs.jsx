import * as React from "react"

const TabsContext = React.createContext()

const Tabs = ({ value, onValueChange, children, className, ...props }) => {
  const [activeTab, setActiveTab] = React.useState(value)

  React.useEffect(() => {
    if (value !== undefined) {
      setActiveTab(value)
    }
  }, [value])

  const handleTabChange = (newValue) => {
    setActiveTab(newValue)
    if (onValueChange) {
      onValueChange(newValue)
    }
  }

  return (
    <TabsContext.Provider value={{ activeTab, onTabChange: handleTabChange }}>
      <div className={`w-full ${className || ''}`} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

const TabsList = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 p-1 text-gray-500 w-full ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
})
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const context = React.useContext(TabsContext)
  
  if (!context) {
    throw new Error("TabsTrigger must be used within a Tabs component")
  }

  const { activeTab, onTabChange } = context
  const isActive = activeTab === value

  const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1"
  const activeClasses = isActive 
    ? "bg-white text-gray-900 shadow-sm border border-gray-200"
    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"

  return (
    <button
      ref={ref}
      type="button"
      className={`${baseClasses} ${activeClasses} ${className || ''}`}
      onClick={() => onTabChange(value)}
      {...props}
    >
      {children}
    </button>
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const context = React.useContext(TabsContext)
  
  if (!context) {
    throw new Error("TabsContent must be used within a Tabs component")
  }

  const { activeTab } = context
  
  if (activeTab !== value) {
    return null
  }

  return (
    <div
      ref={ref}
      className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }



