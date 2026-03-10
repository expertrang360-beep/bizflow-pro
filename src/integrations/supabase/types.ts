export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          key: string
          organization_id: string | null
          updated_at: string
          value: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          key: string
          organization_id?: string | null
          updated_at?: string
          value?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          key?: string
          organization_id?: string | null
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance: {
        Row: {
          asset_id: string
          cost: number
          created_at: string
          created_by: string | null
          description: string
          id: string
          maintenance_date: string
          performed_by: string | null
        }
        Insert: {
          asset_id: string
          cost?: number
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          maintenance_date?: string
          performed_by?: string | null
        }
        Update: {
          asset_id?: string
          cost?: number
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          maintenance_date?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          branch_id: string | null
          category: string
          created_at: string
          created_by: string | null
          depreciation_method: Database["public"]["Enums"]["depreciation_method"]
          description: string | null
          disposal_amount: number | null
          disposal_date: string | null
          id: string
          location: string | null
          name: string
          organization_id: string | null
          purchase_cost: number
          purchase_date: string
          salvage_value: number
          serial_number: string | null
          status: Database["public"]["Enums"]["asset_status"]
          updated_at: string
          useful_life_months: number
        }
        Insert: {
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          depreciation_method?: Database["public"]["Enums"]["depreciation_method"]
          description?: string | null
          disposal_amount?: number | null
          disposal_date?: string | null
          id?: string
          location?: string | null
          name: string
          organization_id?: string | null
          purchase_cost?: number
          purchase_date?: string
          salvage_value?: number
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          updated_at?: string
          useful_life_months?: number
        }
        Update: {
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          depreciation_method?: Database["public"]["Enums"]["depreciation_method"]
          description?: string | null
          disposal_amount?: number | null
          disposal_date?: string | null
          id?: string
          location?: string | null
          name?: string
          organization_id?: string | null
          purchase_cost?: number
          purchase_date?: string
          salvage_value?: number
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          updated_at?: string
          useful_life_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "assets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          after_json: Json | null
          before_json: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_of_materials: {
        Row: {
          active: boolean
          branch_id: string | null
          created_at: string
          description: string | null
          estimated_labor_cost: number
          estimated_overhead_cost: number
          id: string
          name: string
          organization_id: string | null
          product_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          branch_id?: string | null
          created_at?: string
          description?: string | null
          estimated_labor_cost?: number
          estimated_overhead_cost?: number
          id?: string
          name: string
          organization_id?: string | null
          product_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          branch_id?: string | null
          created_at?: string
          description?: string | null
          estimated_labor_cost?: number
          estimated_overhead_cost?: number
          id?: string
          name?: string
          organization_id?: string | null
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_of_materials_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_of_materials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_of_materials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_items: {
        Row: {
          bom_id: string
          created_at: string
          id: string
          quantity: number
          raw_material_id: string
        }
        Insert: {
          bom_id: string
          created_at?: string
          id?: string
          quantity?: number
          raw_material_id: string
        }
        Update: {
          bom_id?: string
          created_at?: string
          id?: string
          quantity?: number
          raw_material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bom_items_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bill_of_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_items_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cashbook_entries: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          direction: Database["public"]["Enums"]["cashbook_direction"]
          entry_date: string
          id: string
          organization_id: string | null
          source_id: string | null
          source_type: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction: Database["public"]["Enums"]["cashbook_direction"]
          entry_date?: string
          id?: string
          organization_id?: string | null
          source_id?: string | null
          source_type: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          direction?: Database["public"]["Enums"]["cashbook_direction"]
          entry_date?: string
          id?: string
          organization_id?: string | null
          source_id?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashbook_entries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashbook_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          branch_id: string | null
          created_at: string
          id: string
          name: string
          organization_id: string | null
          phone: string | null
          total_credit: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
          phone?: string | null
          total_credit?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
          total_credit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_material_usage: {
        Row: {
          created_at: string
          daily_log_id: string
          id: string
          quantity_used: number
          raw_material_id: string
        }
        Insert: {
          created_at?: string
          daily_log_id: string
          id?: string
          quantity_used?: number
          raw_material_id: string
        }
        Update: {
          created_at?: string
          daily_log_id?: string
          id?: string
          quantity_used?: number
          raw_material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_material_usage_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_production_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_material_usage_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_production_logs: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          log_date: string
          notes: string | null
          organization_id: string | null
          product_id: string
          quantity_packaged: number
          quantity_produced: number
          quantity_unpackaged: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          log_date?: string
          notes?: string | null
          organization_id?: string | null
          product_id: string
          quantity_packaged?: number
          quantity_produced?: number
          quantity_unpackaged?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          log_date?: string
          notes?: string | null
          organization_id?: string | null
          product_id?: string
          quantity_packaged?: number
          quantity_produced?: number
          quantity_unpackaged?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_production_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_production_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_production_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_payments: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          note: string | null
          organization_id: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          sale_id: string | null
        }
        Insert: {
          amount: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          note?: string | null
          organization_id?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          sale_id?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          note?: string | null
          organization_id?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          category: string
          created_at: string
          created_by: string | null
          expense_date: string
          id: string
          note: string | null
          organization_id: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          expense_date?: string
          id?: string
          note?: string | null
          organization_id?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          expense_date?: string
          id?: string
          note?: string | null
          organization_id?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          note: string | null
          organization_id: string | null
          product_id: string
          qty: number
          ref_id: string | null
          ref_type: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          organization_id?: string | null
          product_id: string
          qty: number
          ref_id?: string | null
          ref_type?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          organization_id?: string | null
          product_id?: string
          qty?: number
          ref_id?: string | null
          ref_type?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      payroll_items: {
        Row: {
          allowances: number
          base_salary: number
          id: string
          net_pay: number
          other_deductions: number
          paye_tax: number
          payroll_run_id: string
          pension: number
          staff_name: string
          staff_salary_id: string
        }
        Insert: {
          allowances?: number
          base_salary?: number
          id?: string
          net_pay?: number
          other_deductions?: number
          paye_tax?: number
          payroll_run_id: string
          pension?: number
          staff_name: string
          staff_salary_id: string
        }
        Update: {
          allowances?: number
          base_salary?: number
          id?: string
          net_pay?: number
          other_deductions?: number
          paye_tax?: number
          payroll_run_id?: string
          pension?: number
          staff_name?: string
          staff_salary_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_staff_salary_id_fkey"
            columns: ["staff_salary_id"]
            isOneToOne: false
            referencedRelation: "staff_salaries"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          approved_by: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          organization_id: string | null
          paid_date: string | null
          pay_period: string
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["payroll_status"]
          total_deductions: number
          total_gross: number
          total_net: number
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          paid_date?: string | null
          pay_period: string
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["payroll_status"]
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string | null
          paid_date?: string | null
          pay_period?: string
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["payroll_status"]
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      production_costs: {
        Row: {
          amount: number
          cost_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          production_order_id: string
        }
        Insert: {
          amount?: number
          cost_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          production_order_id: string
        }
        Update: {
          amount?: number
          cost_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          production_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_costs_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_material_usage: {
        Row: {
          created_at: string
          id: string
          production_order_id: string
          quantity_used: number
          raw_material_id: string
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          production_order_id: string
          quantity_used?: number
          raw_material_id: string
          total_cost?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          production_order_id?: string
          quantity_used?: number
          raw_material_id?: string
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_material_usage_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_material_usage_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      production_orders: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          bom_id: string
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          organization_id: string | null
          planned_end_date: string | null
          planned_start_date: string | null
          product_id: string
          quantity: number
          status: Database["public"]["Enums"]["production_status"]
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          bom_id: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          product_id: string
          quantity?: number
          status?: Database["public"]["Enums"]["production_status"]
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          bom_id?: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          product_id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["production_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_orders_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bill_of_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          branch_id: string | null
          category: string | null
          cost_price: number
          created_at: string
          id: string
          name: string
          organization_id: string | null
          reorder_level: number | null
          sell_price: number
          sku: string | null
          stock_qty: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          branch_id?: string | null
          category?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
          reorder_level?: number | null
          sell_price?: number
          sku?: string | null
          stock_qty?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          branch_id?: string | null
          category?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          reorder_level?: number | null
          sell_price?: number
          sku?: string | null
          stock_qty?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          name: string
          organization_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id: string
          name: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_items: {
        Row: {
          cost_price: number
          id: string
          product_id: string | null
          product_name: string
          purchase_id: string
          qty: number
          total: number
        }
        Insert: {
          cost_price: number
          id?: string
          product_id?: string | null
          product_name: string
          purchase_id: string
          qty: number
          total: number
        }
        Update: {
          cost_price?: number
          id?: string
          product_id?: string | null
          product_name?: string
          purchase_id?: string
          qty?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          organization_id: string | null
          paid_amount: number
          status: Database["public"]["Enums"]["purchase_status"]
          supplier_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          organization_id?: string | null
          paid_amount?: number
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          organization_id?: string | null
          paid_amount?: number
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_materials: {
        Row: {
          active: boolean
          branch_id: string | null
          category: string | null
          cost_price: number
          created_at: string
          id: string
          name: string
          organization_id: string | null
          reorder_level: number | null
          sku: string | null
          stock_qty: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          branch_id?: string | null
          category?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
          reorder_level?: number | null
          sku?: string | null
          stock_qty?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          branch_id?: string | null
          category?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          reorder_level?: number | null
          sku?: string | null
          stock_qty?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_materials_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_materials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          cost_at_time: number
          discount: number
          id: string
          price: number
          product_id: string | null
          product_name: string
          qty: number
          sale_id: string
          total: number
        }
        Insert: {
          cost_at_time?: number
          discount?: number
          id?: string
          price: number
          product_id?: string | null
          product_name: string
          qty: number
          sale_id: string
          total: number
        }
        Update: {
          cost_at_time?: number
          discount?: number
          id?: string
          price?: number
          product_id?: string | null
          product_name?: string
          qty?: number
          sale_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_paid: number
          branch_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          delivered: boolean
          delivered_at: string | null
          discount: number
          id: string
          note: string | null
          organization_id: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivered?: boolean
          delivered_at?: string | null
          discount?: number
          id?: string
          note?: string | null
          organization_id?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivered?: boolean
          delivered_at?: string | null
          discount?: number
          id?: string
          note?: string | null
          organization_id?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_salaries: {
        Row: {
          account_number: string | null
          active: boolean
          bank_name: string | null
          base_salary: number
          branch_id: string | null
          created_at: string
          id: string
          organization_id: string | null
          role: string | null
          staff_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_number?: string | null
          active?: boolean
          bank_name?: string | null
          base_salary?: number
          branch_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          role?: string | null
          staff_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_number?: string | null
          active?: boolean
          bank_name?: string | null
          base_salary?: number
          branch_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          role?: string | null
          staff_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_salaries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_salaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          organization_id: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          purchase_id: string | null
          supplier_id: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          organization_id?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          purchase_id?: string | null
          supplier_id: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          organization_id?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          purchase_id?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          branch_id: string | null
          created_at: string
          id: string
          name: string
          organization_id: string | null
          phone: string | null
          total_payable: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
          phone?: string | null
          total_payable?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
          total_payable?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_records: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          filed_date: string | null
          id: string
          note: string | null
          organization_id: string | null
          paid_date: string | null
          period_end: string
          period_start: string
          reference_number: string | null
          status: Database["public"]["Enums"]["tax_period_status"]
          tax_amount: number
          tax_type: Database["public"]["Enums"]["tax_type"]
          taxable_amount: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          filed_date?: string | null
          id?: string
          note?: string | null
          organization_id?: string | null
          paid_date?: string | null
          period_end: string
          period_start: string
          reference_number?: string | null
          status?: Database["public"]["Enums"]["tax_period_status"]
          tax_amount?: number
          tax_type: Database["public"]["Enums"]["tax_type"]
          taxable_amount?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          filed_date?: string | null
          id?: string
          note?: string | null
          organization_id?: string | null
          paid_date?: string | null
          period_end?: string
          period_start?: string
          reference_number?: string | null
          status?: Database["public"]["Enums"]["tax_period_status"]
          tax_amount?: number
          tax_type?: Database["public"]["Enums"]["tax_type"]
          taxable_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          branch_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          branch_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_production_order: { Args: { p_order_id: string }; Returns: Json }
      get_user_branch: { Args: { _user_id: string }; Returns: string }
      get_user_organization_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_customer_credit_atomic: {
        Args: { p_credit_delta: number; p_customer_id: string }
        Returns: number
      }
      update_raw_material_stock_atomic: {
        Args: { p_material_id: string; p_quantity_delta: number }
        Returns: number
      }
      update_stock_atomic: {
        Args: { p_product_id: string; p_quantity_delta: number }
        Returns: number
      }
      update_supplier_payable_atomic: {
        Args: { p_payable_delta: number; p_supplier_id: string }
        Returns: number
      }
      user_can_access_branch: {
        Args: { p_branch_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "manager" | "cashier" | "accountant"
      asset_status: "active" | "disposed" | "maintenance" | "retired"
      business_type: "trader" | "manufacturer"
      cashbook_direction: "in" | "out"
      depreciation_method: "straight_line" | "declining_balance"
      payment_type: "cash" | "transfer" | "pos" | "credit"
      payroll_status: "draft" | "approved" | "paid"
      production_status: "draft" | "in_progress" | "completed" | "cancelled"
      purchase_status: "paid" | "partial" | "unpaid"
      sale_status: "completed" | "credit" | "partial" | "cancelled"
      tax_period_status: "open" | "filed" | "paid"
      tax_type: "vat" | "cit"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "manager", "cashier", "accountant"],
      asset_status: ["active", "disposed", "maintenance", "retired"],
      business_type: ["trader", "manufacturer"],
      cashbook_direction: ["in", "out"],
      depreciation_method: ["straight_line", "declining_balance"],
      payment_type: ["cash", "transfer", "pos", "credit"],
      payroll_status: ["draft", "approved", "paid"],
      production_status: ["draft", "in_progress", "completed", "cancelled"],
      purchase_status: ["paid", "partial", "unpaid"],
      sale_status: ["completed", "credit", "partial", "cancelled"],
      tax_period_status: ["open", "filed", "paid"],
      tax_type: ["vat", "cit"],
    },
  },
} as const
