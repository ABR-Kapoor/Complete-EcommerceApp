import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
  color?: string;
}

interface CustomDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export const CustomDropdown = ({ options, value, onChange, placeholder, label }: CustomDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="field" ref={dropdownRef}>
      {label && <label className="label">{label}</label>}
      <div className="custom-select-container">
        <div 
          className="custom-select-trigger" 
          onClick={() => setIsOpen(!isOpen)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {selectedOption?.color && (
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: selectedOption.color, flexShrink: 0 }}></div>
            )}
            <span style={{ whiteSpace: "nowrap" }}>{selectedOption ? selectedOption.label : placeholder || "Select option"}</span>
          </div>
          <ChevronDown size={20} className={isOpen ? "spin-half" : ""} style={{ transition: "transform 0.2s ease" }} />
        </div>
        
        {isOpen && (
          <div className="custom-select-options">
            {options.map(option => (
              <div 
                key={option.value}
                className={`custom-select-option ${option.value === value ? "active" : ""}`}
                style={{ 
                  whiteSpace: "nowrap",
                  padding: "12px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "all 0.2s ease",
                  backgroundColor: option.value === value ? (option.color ? option.color + "15" : "rgba(99, 102, 241, 0.08)") : "transparent",
                  color: option.value === value ? (option.color || "var(--accent)") : "#475569"
                }}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                onMouseEnter={(e) => {
                  if (option.color) e.currentTarget.style.backgroundColor = option.color + "25";
                }}
                onMouseLeave={(e) => {
                  if (option.value !== value) e.currentTarget.style.backgroundColor = "transparent";
                  else if (option.color) e.currentTarget.style.backgroundColor = option.color + "15";
                }}
              >
                {option.color && (
                  <div style={{ 
                    width: 10, 
                    height: 10, 
                    borderRadius: "50%", 
                    background: option.color, 
                    flexShrink: 0,
                    boxShadow: `0 0 10px ${option.color}40`
                  }}></div>
                )}
                <span style={{ fontWeight: option.value === value ? 800 : 600 }}>{option.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
