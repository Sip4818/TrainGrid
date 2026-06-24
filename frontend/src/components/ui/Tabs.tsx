import type { ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  children: ReactNode;
}

const tabsListStyle: React.CSSProperties = {
  display: "flex",
  borderBottom: "1px solid #e5e7eb",
  marginBottom: "16px",
};

const tabButtonBase: React.CSSProperties = {
  padding: "8px 16px",
  border: "none",
  background: "none",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 500,
  color: "#6b7280",
  borderBottom: "2px solid transparent",
  marginBottom: "-1px",
};

const tabActiveStyle: React.CSSProperties = {
  color: "#2563eb",
  borderBottomColor: "#2563eb",
};

export function Tabs({
  tabs,
  activeTab,
  onChange,
  children,
}: TabsProps): React.ReactElement {
  return (
    <div>
      <div style={tabsListStyle} role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              style={{
                ...tabButtonBase,
                ...(isActive ? tabActiveStyle : {}),
              }}
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{children}</div>
    </div>
  );
}

