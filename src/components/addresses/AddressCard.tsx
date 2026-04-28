"use client";

interface Address {
  id: number;
  contact_name: string;
  phone: string;
  country_code: string | null;
  country_name: string;
  state_code: string | null;
  state_name: string | null;
  city: string;
  street_address: string;
  street_address_2?: string;
  postal_code?: string;
  label?: string;
  is_default: boolean;
  formatted_address?: string;
}

interface AddressCardProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (id: number) => void;
  onSetDefault: (id: number) => void;
}

export default function AddressCard({ address, onEdit, onDelete, onSetDefault }: AddressCardProps) {
  const displayAddress = address.formatted_address || [
    address.country_name,
    address.state_name,
    address.city,
    address.street_address
  ].filter(Boolean).join(', ');

  return (
    <div className={`p-4 border rounded-lg bg-card ${
      address.is_default ? 'border-accent ring-2 ring-accent/20' : 'border-border'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {address.label && (
            <span className="text-sm font-medium text-text bg-background px-2 py-1 rounded">
              {address.label}
            </span>
          )}
          {address.is_default && (
            <span className="text-xs font-medium text-white bg-accent px-2 py-1 rounded">
              默认
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1 mb-4">
        <p className="font-medium text-dark">{address.contact_name}</p>
        <p className="text-sm text-text">{address.phone}</p>
        <p className="text-sm text-text-muted">{displayAddress}</p>
        {address.street_address_2 && (
          <p className="text-sm text-text-muted">{address.street_address_2}</p>
        )}
        {address.postal_code && (
          <p className="text-sm text-text-muted">邮编: {address.postal_code}</p>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        <button
          onClick={() => onEdit(address)}
          className="flex-1 px-3 py-2 text-sm text-text bg-background hover:bg-background-alt rounded-md transition-colors"
        >
          编辑
        </button>
        {!address.is_default && (
          <button
            onClick={() => onSetDefault(address.id)}
            className="flex-1 px-3 py-2 text-sm text-accent bg-background hover:bg-background-alt rounded-md transition-colors"
          >
            设为默认
          </button>
        )}
        <button
          onClick={() => onDelete(address.id)}
          className="px-3 py-2 text-sm text-red-500 bg-background hover:bg-red-50 rounded-md transition-colors"
        >
          删除
        </button>
      </div>
    </div>
  );
}
