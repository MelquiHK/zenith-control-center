export type Currency = 'CUP' | 'USD'
export type TxType = 'income' | 'expense'
export type ServiceStatus = 'Pendiente' | 'En Proceso' | 'Cobrado'

export interface Transaction {
  id: string
  type: TxType
  category: string
  description: string
  amount: number
  currency: Currency
  cup_equiv: number
  created_at: string
}

export interface Product {
  id: string
  name: string
  category: string
  stock: number
  price_cup: number
  price_usd: number
  created_at: string
}

export interface Sale {
  id: string
  product_id: string
  product_name: string
  category: string
  quantity: number
  unit_price: number
  total: number
  currency: Currency
  cup_equiv: number
  client: string
  notes: string
  created_at: string
}

export interface ServiceOrder {
  id: string
  client: string
  phone: string
  address: string
  service_type: string
  description: string
  status: ServiceStatus
  price: number
  currency: Currency
  manager: string
  commission_pct: number
  notes: string
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  name: string
  target_amount: number
  currency: Currency
  allocated: number
  emoji: string
  color: string
}

export interface BodyStat {
  id: string
  date: string
  weight: number
  bench_press: number
  bicep_curl: number
  notes: string
  created_at: string
}

export interface Settings {
  id: string
  exchange_rate: number
  updated_at: string
}
