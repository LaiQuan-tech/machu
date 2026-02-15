import React from 'react';

export enum ConsultationType {
  CAREER = '事業前途',
  HEALTH = '身體健康',
  MARRIAGE = '姻緣感情',
  FAMILY = '家庭家運',
  FORTUNE = '財運補庫',
  OTHER = '其他疑難'
}

export interface BookingData {
  name: string;
  phone: string;
  birthDate: string; // Lunar birthday is often preferred, but standard date for simplicity
  bookingDate: string;
  bookingTime: string;
  type: ConsultationType;
  notes?: string;
}

export interface ServiceItem {
  title: string;
  description: string;
  icon: React.ReactNode;
}