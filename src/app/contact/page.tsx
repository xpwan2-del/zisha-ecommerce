'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ContactData {
  title: string;
  description: string;
  address: string;
  email: string;
  phone: string;
  opening_hours: string;
  images: string[];
}

export default function ContactPage() {
  const { i18n } = useTranslation();
  const [contact, setContact] = useState<ContactData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContact();
  }, [i18n.language]);

  const fetchContact = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contact?lang=${i18n.language}`);
      const data = await response.json();
      setContact(data);
    } catch (error) {
      console.error('Error fetching contact:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF2F8] middle-east-pattern flex items-center justify-center">
        <div className="text-xl text-[#831843] font-['Noto_Sans_Arabic']">Loading...</div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-[#FDF2F8] middle-east-pattern flex items-center justify-center">
        <div className="text-xl text-[#831843] font-['Noto_Sans_Arabic']">No data</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF2F8] middle-east-pattern">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold font-['Noto_Naskh_Arabic'] text-[#831843] mb-8 text-center">{contact.title}</h1>
        <div className="glass-effect rounded-lg shadow-md p-6">
          <p className="mb-6 text-[#831843] font-['Noto_Sans_Arabic']">{contact.description}</p>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2 font-['Noto_Naskh_Arabic'] text-[#831843]">Email</h2>
              <p className="text-[#831843] font-['Noto_Sans_Arabic']">{contact.email}</p>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2 font-['Noto_Naskh_Arabic'] text-[#831843]">Phone</h2>
              <p className="text-[#831843] font-['Noto_Sans_Arabic']">{contact.phone}</p>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2 font-['Noto_Naskh_Arabic'] text-[#831843]">Address</h2>
              <p className="text-[#831843] font-['Noto_Sans_Arabic']">{contact.address}</p>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2 font-['Noto_Naskh_Arabic'] text-[#831843]">Opening Hours</h2>
              <p className="text-[#831843] font-['Noto_Sans_Arabic'] whitespace-pre-line">{contact.opening_hours}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
