import React from 'react';
import { CommunityContact } from '../types';
import { getContactProducts } from './BuyerSokoCard';
import { ContactRowCard, hashOf } from './ContactRowCard';

const poNumber = (c: CommunityContact) => `PO ${String((hashOf(c.id + c.company) % 90000) + 10000)}`;

interface MyNetworkTableProps {
  contacts: CommunityContact[];
  isSaved: (c: CommunityContact) => boolean;
  onToggleSave: (c: CommunityContact) => void;
  onShare: (c: CommunityContact) => void;
}

export const MyNetworkTable: React.FC<MyNetworkTableProps> = ({ contacts, isSaved, onToggleSave, onShare }) => (
  <div className="space-y-3">
    {contacts.map((c) => (
      <ContactRowCard
        key={c.id}
        companyName={c.company}
        verified={Boolean(c.verified)}
        location={`${poNumber(c)} ${c.location}`}
        personName={c.name}
        personTitle={c.title}
        phone={c.phone}
        whatsapp={c.whatsappNumber}
        email={c.email}
        tags={[...getContactProducts(c), ...c.tags]}
        isSaved={isSaved(c)}
        onToggleSave={() => onToggleSave(c)}
        onShare={() => onShare(c)}
      />
    ))}
  </div>
);
