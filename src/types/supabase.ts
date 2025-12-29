export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      backorders: {
        Row: {
          comments: string | null
          complete: boolean
          created_at: string
          date_entered: string | null
          due_date: string | null
          id: number
          job_id: number
        }
        Insert: {
          comments?: string | null
          complete?: boolean
          created_at?: string
          date_entered?: string | null
          due_date?: string | null
          id?: number
          job_id: number
        }
        Update: {
          comments?: string | null
          complete?: boolean
          created_at?: string
          date_entered?: string | null
          due_date?: string | null
          id?: number
          job_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "backorders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "inspection_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "backorders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "installation_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "backorders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backorders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "plant_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "backorders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "prod_table_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backorders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "sales_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "backorders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "service_orders_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "backorders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "shipped_not_invoiced_view"
            referencedColumns: ["id"]
          },
        ]
      }
      cabinets: {
        Row: {
          box: string | null
          color_id: number | null
          color_name_legacy: string | null
          created_at: string
          door_style_id: number | null
          door_style_name_legacy: string | null
          doors_parts_only: boolean | null
          drawer_box: string | null
          drawer_hardware: string | null
          finish: string | null
          glass: boolean | null
          glass_type: string | null
          glaze: string | null
          handles_selected: boolean | null
          handles_supplied: boolean | null
          hardware_only: boolean | null
          hardware_quantity: string | null
          hinge_soft_close: boolean | null
          id: number
          interior: string | null
          piece_count: string | null
          species_id: number | null
          species_name_legacy: string | null
          top_drawer_front: string | null
          updated_at: string
        }
        Insert: {
          box?: string | null
          color_id?: number | null
          color_name_legacy?: string | null
          created_at?: string
          door_style_id?: number | null
          door_style_name_legacy?: string | null
          doors_parts_only?: boolean | null
          drawer_box?: string | null
          drawer_hardware?: string | null
          finish?: string | null
          glass?: boolean | null
          glass_type?: string | null
          glaze?: string | null
          handles_selected?: boolean | null
          handles_supplied?: boolean | null
          hardware_only?: boolean | null
          hardware_quantity?: string | null
          hinge_soft_close?: boolean | null
          id?: number
          interior?: string | null
          piece_count?: string | null
          species_id?: number | null
          species_name_legacy?: string | null
          top_drawer_front?: string | null
          updated_at?: string
        }
        Update: {
          box?: string | null
          color_id?: number | null
          color_name_legacy?: string | null
          created_at?: string
          door_style_id?: number | null
          door_style_name_legacy?: string | null
          doors_parts_only?: boolean | null
          drawer_box?: string | null
          drawer_hardware?: string | null
          finish?: string | null
          glass?: boolean | null
          glass_type?: string | null
          glaze?: string | null
          handles_selected?: boolean | null
          handles_supplied?: boolean | null
          hardware_only?: boolean | null
          hardware_quantity?: string | null
          hinge_soft_close?: boolean | null
          id?: number
          interior?: string | null
          piece_count?: string | null
          species_id?: number | null
          species_name_legacy?: string | null
          top_drawer_front?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cabinets_colors"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["Id"]
          },
          {
            foreignKeyName: "fk_cabinets_door_styles"
            columns: ["door_style_id"]
            isOneToOne: false
            referencedRelation: "door_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cabinets_species"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["Id"]
          },
        ]
      }
      client: {
        Row: {
          city: string | null
          createdAt: string
          designer: string | null
          email1: string | null
          email2: string | null
          firstName: string | null
          id: number
          lastName: string
          legacy_id: string | null
          phone1: string | null
          phone2: string | null
          province: string | null
          street: string | null
          updatedAt: string
          zip: string | null
        }
        Insert: {
          city?: string | null
          createdAt?: string
          designer?: string | null
          email1?: string | null
          email2?: string | null
          firstName?: string | null
          id?: number
          lastName: string
          legacy_id?: string | null
          phone1?: string | null
          phone2?: string | null
          province?: string | null
          street?: string | null
          updatedAt?: string
          zip?: string | null
        }
        Update: {
          city?: string | null
          createdAt?: string
          designer?: string | null
          email1?: string | null
          email2?: string | null
          firstName?: string | null
          id?: number
          lastName?: string
          legacy_id?: string | null
          phone1?: string | null
          phone2?: string | null
          province?: string | null
          street?: string | null
          updatedAt?: string
          zip?: string | null
        }
        Relationships: []
      }
      colors: {
        Row: {
          Id: number
          Name: string | null
        }
        Insert: {
          Id?: number
          Name?: string | null
        }
        Update: {
          Id?: number
          Name?: string | null
        }
        Relationships: []
      }
      door_styles: {
        Row: {
          id: number
          is_made_in_house: boolean
          is_pre_manufactured: boolean
          model: string
          name: string
        }
        Insert: {
          id?: never
          is_made_in_house?: boolean
          is_pre_manufactured?: boolean
          model: string
          name: string
        }
        Update: {
          id?: never
          is_made_in_house?: boolean
          is_pre_manufactured?: boolean
          model?: string
          name?: string
        }
        Relationships: []
      }
      homeowners_info: {
        Row: {
          created_at: string | null
          homeowner_details: string | null
          homeowner_email: string | null
          homeowner_name: string | null
          homeowner_phone: string | null
          id: number
          job_id: number
        }
        Insert: {
          created_at?: string | null
          homeowner_details?: string | null
          homeowner_email?: string | null
          homeowner_name?: string | null
          homeowner_phone?: string | null
          id?: never
          job_id: number
        }
        Update: {
          created_at?: string | null
          homeowner_details?: string | null
          homeowner_email?: string | null
          homeowner_name?: string | null
          homeowner_phone?: string | null
          id?: never
          job_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "homeowners_info_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "inspection_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "homeowners_info_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "installation_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "homeowners_info_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homeowners_info_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "plant_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "homeowners_info_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "prod_table_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homeowners_info_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "sales_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "homeowners_info_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "service_orders_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "homeowners_info_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "shipped_not_invoiced_view"
            referencedColumns: ["id"]
          },
        ]
      }
      installation: {
        Row: {
          created_at: string
          has_shipped: boolean
          in_warehouse: string | null
          inspection_completed: string | null
          inspection_date: string | null
          installation_completed: string | null
          installation_date: string | null
          installation_id: number
          installation_notes: string | null
          installation_report_received: string | null
          installer_id: number | null
          legacy_ref: string | null
          partially_shipped: boolean | null
          wrap_completed: string | null
          wrap_date: string | null
        }
        Insert: {
          created_at?: string
          has_shipped?: boolean
          in_warehouse?: string | null
          inspection_completed?: string | null
          inspection_date?: string | null
          installation_completed?: string | null
          installation_date?: string | null
          installation_id?: number
          installation_notes?: string | null
          installation_report_received?: string | null
          installer_id?: number | null
          legacy_ref?: string | null
          partially_shipped?: boolean | null
          wrap_completed?: string | null
          wrap_date?: string | null
        }
        Update: {
          created_at?: string
          has_shipped?: boolean
          in_warehouse?: string | null
          inspection_completed?: string | null
          inspection_date?: string | null
          installation_completed?: string | null
          installation_date?: string | null
          installation_id?: number
          installation_notes?: string | null
          installation_report_received?: string | null
          installer_id?: number | null
          legacy_ref?: string | null
          partially_shipped?: boolean | null
          wrap_completed?: string | null
          wrap_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_installer"
            columns: ["installer_id"]
            isOneToOne: false
            referencedRelation: "installers"
            referencedColumns: ["installer_id"]
          },
        ]
      }
      installers: {
        Row: {
          acc_number: string | null
          city: string | null
          company_name: string | null
          created_at: string
          email: string | null
          first_name: string | null
          gst_number: string | null
          has_first_aid: boolean | null
          has_insurance: boolean | null
          installer_id: number
          is_active: boolean
          last_name: string | null
          legacy_installer_id: string | null
          notes: string | null
          phone_number: string | null
          street_address: string | null
          wcb_number: string | null
          zip_code: string | null
        }
        Insert: {
          acc_number?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          gst_number?: string | null
          has_first_aid?: boolean | null
          has_insurance?: boolean | null
          installer_id?: number
          is_active?: boolean
          last_name?: string | null
          legacy_installer_id?: string | null
          notes?: string | null
          phone_number?: string | null
          street_address?: string | null
          wcb_number?: string | null
          zip_code?: string | null
        }
        Update: {
          acc_number?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          gst_number?: string | null
          has_first_aid?: boolean | null
          has_insurance?: boolean | null
          installer_id?: number
          is_active?: boolean
          last_name?: string | null
          legacy_installer_id?: string | null
          notes?: string | null
          phone_number?: string | null
          street_address?: string | null
          wcb_number?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          comments: string | null
          created_at: string | null
          date_due: string | null
          date_entered: string | null
          invoice_id: number
          invoice_number: string | null
          job_id: number
          no_charge: boolean | null
          paid_at: string | null
          updated_at: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          date_due?: string | null
          date_entered?: string | null
          invoice_id?: number
          invoice_number?: string | null
          job_id: number
          no_charge?: boolean | null
          paid_at?: string | null
          updated_at?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          date_due?: string | null
          date_entered?: string | null
          invoice_id?: number
          invoice_number?: string | null
          job_id?: number
          no_charge?: boolean | null
          paid_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "inspection_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "installation_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "plant_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "prod_table_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "sales_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "service_orders_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "shipped_not_invoiced_view"
            referencedColumns: ["id"]
          },
        ]
      }
      job_attachments: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: number
          job_id: number
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: never
          job_id: number
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: never
          job_id?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_attachments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "inspection_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_attachments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "installation_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_attachments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_attachments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "plant_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_attachments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "prod_table_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_attachments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "sales_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_attachments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "service_orders_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_attachments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "shipped_not_invoiced_view"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string
          id: number
          installation_id: number | null
          is_active: boolean
          job_base_number: string
          job_number: string
          job_suffix: string | null
          prod_id: number | null
          sales_order_id: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          installation_id?: number | null
          is_active?: boolean
          job_base_number: string
          job_number?: string
          job_suffix?: string | null
          prod_id?: number | null
          sales_order_id?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          installation_id?: number | null
          is_active?: boolean
          job_base_number?: string
          job_number?: string
          job_suffix?: string | null
          prod_id?: number | null
          sales_order_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_installation_id"
            columns: ["installation_id"]
            isOneToOne: true
            referencedRelation: "inspection_table_view"
            referencedColumns: ["installation_id"]
          },
          {
            foreignKeyName: "fk_installation_id"
            columns: ["installation_id"]
            isOneToOne: true
            referencedRelation: "installation"
            referencedColumns: ["installation_id"]
          },
          {
            foreignKeyName: "fk_installation_id"
            columns: ["installation_id"]
            isOneToOne: true
            referencedRelation: "installation_table_view"
            referencedColumns: ["installation_id"]
          },
          {
            foreignKeyName: "fk_installation_id"
            columns: ["installation_id"]
            isOneToOne: true
            referencedRelation: "plant_table_view"
            referencedColumns: ["installation_id"]
          },
          {
            foreignKeyName: "fk_jobs_sales_order_id"
            columns: ["sales_order_id"]
            isOneToOne: true
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_jobs_sales_order_id"
            columns: ["sales_order_id"]
            isOneToOne: true
            referencedRelation: "sales_table_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_prod_id_fkey"
            columns: ["prod_id"]
            isOneToOne: false
            referencedRelation: "prod_table_view"
            referencedColumns: ["prod_id"]
          },
          {
            foreignKeyName: "jobs_prod_id_fkey"
            columns: ["prod_id"]
            isOneToOne: false
            referencedRelation: "production_schedule"
            referencedColumns: ["prod_id"]
          },
        ]
      }
      production_schedule: {
        Row: {
          assembly_completed_actual: string | null
          assembly_schedule: string | null
          box_assembled_count: number
          created_at: string
          custom_finish_completed_actual: string | null
          cut_finish_completed_actual: string | null
          cut_finish_schedule: string | null
          cut_melamine_completed_actual: string | null
          cut_melamine_schedule: string | null
          doors_completed_actual: string | null
          doors_in_schedule: string | null
          doors_out_schedule: string | null
          drawer_completed_actual: string | null
          in_plant_actual: string | null
          paint_completed_actual: string | null
          paint_in_schedule: string | null
          paint_out_schedule: string | null
          placement_date: string | null
          prod_id: number
          production_comments: string | null
          received_date: string | null
          rush: boolean
          ship_confirmed_legacy: boolean | null
          ship_schedule: string | null
          ship_status: Database["public"]["Enums"]["ShippingStatus"]
          updated_at: string
        }
        Insert: {
          assembly_completed_actual?: string | null
          assembly_schedule?: string | null
          box_assembled_count?: number
          created_at?: string
          custom_finish_completed_actual?: string | null
          cut_finish_completed_actual?: string | null
          cut_finish_schedule?: string | null
          cut_melamine_completed_actual?: string | null
          cut_melamine_schedule?: string | null
          doors_completed_actual?: string | null
          doors_in_schedule?: string | null
          doors_out_schedule?: string | null
          drawer_completed_actual?: string | null
          in_plant_actual?: string | null
          paint_completed_actual?: string | null
          paint_in_schedule?: string | null
          paint_out_schedule?: string | null
          placement_date?: string | null
          prod_id?: number
          production_comments?: string | null
          received_date?: string | null
          rush?: boolean
          ship_confirmed_legacy?: boolean | null
          ship_schedule?: string | null
          ship_status?: Database["public"]["Enums"]["ShippingStatus"]
          updated_at?: string
        }
        Update: {
          assembly_completed_actual?: string | null
          assembly_schedule?: string | null
          box_assembled_count?: number
          created_at?: string
          custom_finish_completed_actual?: string | null
          cut_finish_completed_actual?: string | null
          cut_finish_schedule?: string | null
          cut_melamine_completed_actual?: string | null
          cut_melamine_schedule?: string | null
          doors_completed_actual?: string | null
          doors_in_schedule?: string | null
          doors_out_schedule?: string | null
          drawer_completed_actual?: string | null
          in_plant_actual?: string | null
          paint_completed_actual?: string | null
          paint_in_schedule?: string | null
          paint_out_schedule?: string | null
          placement_date?: string | null
          prod_id?: number
          production_comments?: string | null
          received_date?: string | null
          rush?: boolean
          ship_confirmed_legacy?: boolean | null
          ship_schedule?: string | null
          ship_status?: Database["public"]["Enums"]["ShippingStatus"]
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          company: string | null
          created_at: string | null
          id: number
          is_received: boolean | null
          item_type: string
          part_description: string
          po_number: string | null
          purchase_tracking_id: number
          qty_received: number | null
          quantity: number | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          id?: number
          is_received?: boolean | null
          item_type: string
          part_description: string
          po_number?: string | null
          purchase_tracking_id: number
          qty_received?: number | null
          quantity?: number | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          id?: number
          is_received?: boolean | null
          item_type?: string
          part_description?: string
          po_number?: string | null
          purchase_tracking_id?: number
          qty_received?: number | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_purchase_tracking_id_fkey"
            columns: ["purchase_tracking_id"]
            isOneToOne: false
            referencedRelation: "purchase_tracking"
            referencedColumns: ["purchase_check_id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_tracking_id_fkey"
            columns: ["purchase_tracking_id"]
            isOneToOne: false
            referencedRelation: "purchasing_table_view"
            referencedColumns: ["purchase_check_id"]
          },
        ]
      }
      purchase_tracking: {
        Row: {
          acc_ordered_at: string | null
          acc_received_at: string | null
          acc_received_incomplete_at: string | null
          doors_ordered_at: string | null
          doors_received_at: string | null
          doors_received_incomplete_at: string | null
          glass_ordered_at: string | null
          glass_received_at: string | null
          glass_received_incomplete_at: string | null
          handles_ordered_at: string | null
          handles_received_at: string | null
          handles_received_incomplete_at: string | null
          job_id: number
          purchase_check_id: number
          purchasing_comments: string | null
          updated_at: string | null
        }
        Insert: {
          acc_ordered_at?: string | null
          acc_received_at?: string | null
          acc_received_incomplete_at?: string | null
          doors_ordered_at?: string | null
          doors_received_at?: string | null
          doors_received_incomplete_at?: string | null
          glass_ordered_at?: string | null
          glass_received_at?: string | null
          glass_received_incomplete_at?: string | null
          handles_ordered_at?: string | null
          handles_received_at?: string | null
          handles_received_incomplete_at?: string | null
          job_id: number
          purchase_check_id?: number
          purchasing_comments?: string | null
          updated_at?: string | null
        }
        Update: {
          acc_ordered_at?: string | null
          acc_received_at?: string | null
          acc_received_incomplete_at?: string | null
          doors_ordered_at?: string | null
          doors_received_at?: string | null
          doors_received_incomplete_at?: string | null
          glass_ordered_at?: string | null
          glass_received_at?: string | null
          glass_received_incomplete_at?: string | null
          handles_ordered_at?: string | null
          handles_received_at?: string | null
          handles_received_incomplete_at?: string | null
          job_id?: number
          purchase_check_id?: number
          purchasing_comments?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "inspection_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "purchase_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "installation_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "purchase_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "plant_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "purchase_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "prod_table_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "sales_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "purchase_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "service_orders_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "purchase_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "shipped_not_invoiced_view"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          appliance_specs_date: string | null
          cabinet_id: number
          client_id: number
          client_meeting_date: string | null
          comments: string | null
          counter_by: string | null
          counter_color: string | null
          counter_top: string | null
          counter_type: string | null
          created_at: string
          date_sold: string | null
          delivery_type: string | null
          deposit: number | null
          designer: string | null
          flooring_clearance: string | null
          flooring_type: string | null
          follow_up_date: string | null
          id: number
          install: boolean
          invoice_balance: number | null
          is_memo: boolean | null
          layout_date: string | null
          markout_date: string | null
          order_type: string | null
          review_date: string | null
          sales_order_number: string | null
          second_markout_date: string | null
          selections_date: string | null
          shipping_city: string | null
          shipping_client_name: string | null
          shipping_email_1: string | null
          shipping_email_2: string | null
          shipping_phone_1: string | null
          shipping_phone_2: string | null
          shipping_province: string | null
          shipping_street: string | null
          shipping_zip: string | null
          stage: Database["public"]["Enums"]["SalesStage"]
          total: number | null
          updated_at: string
        }
        Insert: {
          appliance_specs_date?: string | null
          cabinet_id: number
          client_id: number
          client_meeting_date?: string | null
          comments?: string | null
          counter_by?: string | null
          counter_color?: string | null
          counter_top?: string | null
          counter_type?: string | null
          created_at?: string
          date_sold?: string | null
          delivery_type?: string | null
          deposit?: number | null
          designer?: string | null
          flooring_clearance?: string | null
          flooring_type?: string | null
          follow_up_date?: string | null
          id?: number
          install?: boolean
          invoice_balance?: number | null
          is_memo?: boolean | null
          layout_date?: string | null
          markout_date?: string | null
          order_type?: string | null
          review_date?: string | null
          sales_order_number?: string | null
          second_markout_date?: string | null
          selections_date?: string | null
          shipping_city?: string | null
          shipping_client_name?: string | null
          shipping_email_1?: string | null
          shipping_email_2?: string | null
          shipping_phone_1?: string | null
          shipping_phone_2?: string | null
          shipping_province?: string | null
          shipping_street?: string | null
          shipping_zip?: string | null
          stage?: Database["public"]["Enums"]["SalesStage"]
          total?: number | null
          updated_at?: string
        }
        Update: {
          appliance_specs_date?: string | null
          cabinet_id?: number
          client_id?: number
          client_meeting_date?: string | null
          comments?: string | null
          counter_by?: string | null
          counter_color?: string | null
          counter_top?: string | null
          counter_type?: string | null
          created_at?: string
          date_sold?: string | null
          delivery_type?: string | null
          deposit?: number | null
          designer?: string | null
          flooring_clearance?: string | null
          flooring_type?: string | null
          follow_up_date?: string | null
          id?: number
          install?: boolean
          invoice_balance?: number | null
          is_memo?: boolean | null
          layout_date?: string | null
          markout_date?: string | null
          order_type?: string | null
          review_date?: string | null
          sales_order_number?: string | null
          second_markout_date?: string | null
          selections_date?: string | null
          shipping_city?: string | null
          shipping_client_name?: string | null
          shipping_email_1?: string | null
          shipping_email_2?: string | null
          shipping_phone_1?: string | null
          shipping_phone_2?: string | null
          shipping_province?: string | null
          shipping_street?: string | null
          shipping_zip?: string | null
          stage?: Database["public"]["Enums"]["SalesStage"]
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_cabinet_id_fkey"
            columns: ["cabinet_id"]
            isOneToOne: false
            referencedRelation: "cabinets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_parts: {
        Row: {
          description: string | null
          id: number
          part: string
          qty: number
          service_order_id: number
        }
        Insert: {
          description?: string | null
          id?: number
          part: string
          qty?: number
          service_order_id: number
        }
        Update: {
          description?: string | null
          id?: number
          part?: string
          qty?: number
          service_order_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_order_parts_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["service_order_id"]
          },
          {
            foreignKeyName: "service_order_parts_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders_table_view"
            referencedColumns: ["service_order_id"]
          },
        ]
      }
      service_orders: {
        Row: {
          chargeable: boolean | null
          comments: string | null
          completed_at: string | null
          created_by: string | null
          date_entered: string
          due_date: string | null
          hours_estimated: number | null
          installer_id: number | null
          installer_requested: boolean | null
          is_warranty_so: boolean | null
          job_id: number
          service_by: string | null
          service_by_detail: string | null
          service_order_id: number
          service_order_number: string
          service_type: string | null
          service_type_detail: string | null
          warranty_order_cost: number | null
        }
        Insert: {
          chargeable?: boolean | null
          comments?: string | null
          completed_at?: string | null
          created_by?: string | null
          date_entered?: string
          due_date?: string | null
          hours_estimated?: number | null
          installer_id?: number | null
          installer_requested?: boolean | null
          is_warranty_so?: boolean | null
          job_id: number
          service_by?: string | null
          service_by_detail?: string | null
          service_order_id?: number
          service_order_number: string
          service_type?: string | null
          service_type_detail?: string | null
          warranty_order_cost?: number | null
        }
        Update: {
          chargeable?: boolean | null
          comments?: string | null
          completed_at?: string | null
          created_by?: string | null
          date_entered?: string
          due_date?: string | null
          hours_estimated?: number | null
          installer_id?: number | null
          installer_requested?: boolean | null
          is_warranty_so?: boolean | null
          job_id?: number
          service_by?: string | null
          service_by_detail?: string | null
          service_order_id?: number
          service_order_number?: string
          service_type?: string | null
          service_type_detail?: string | null
          warranty_order_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_installer_id_fkey"
            columns: ["installer_id"]
            isOneToOne: false
            referencedRelation: "installers"
            referencedColumns: ["installer_id"]
          },
          {
            foreignKeyName: "service_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "inspection_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "service_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "installation_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "service_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "plant_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "service_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "prod_table_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "sales_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "service_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "service_orders_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "service_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "shipped_not_invoiced_view"
            referencedColumns: ["id"]
          },
        ]
      }
      species: {
        Row: {
          Id: number
          Prefinished: boolean | null
          Species: string | null
        }
        Insert: {
          Id?: number
          Prefinished?: boolean | null
          Species?: string | null
        }
        Update: {
          Id?: number
          Prefinished?: boolean | null
          Species?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      backorders_view: {
        Row: {
          comments: string | null
          complete: boolean | null
          created_at: string | null
          date_entered: string | null
          due_date: string | null
          id: number | null
          job_id: number | null
          job_number: string | null
          shipping_city: string | null
          shipping_client_name: string | null
          shipping_province: string | null
          shipping_street: string | null
          shipping_zip: string | null
          site_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backorders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "inspection_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "backorders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "installation_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "backorders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backorders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "plant_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "backorders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "prod_table_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backorders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "sales_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "backorders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "service_orders_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "backorders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "shipped_not_invoiced_view"
            referencedColumns: ["id"]
          },
        ]
      }
      debug_auth: {
        Row: {
          full_token_payload: Json | null
          role_in_jwt: string | null
          user_id: string | null
        }
        Relationships: []
      }
      inspection_table_view: {
        Row: {
          inspection_completed: string | null
          inspection_date: string | null
          installation_date: string | null
          installation_id: number | null
          installer_company: string | null
          installer_first_name: string | null
          installer_id: number | null
          installer_last_name: string | null
          job_id: number | null
          job_number: string | null
          rush: boolean | null
          shipping_client_name: string | null
          site_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_installer"
            columns: ["installer_id"]
            isOneToOne: false
            referencedRelation: "installers"
            referencedColumns: ["installer_id"]
          },
        ]
      }
      installation_table_view: {
        Row: {
          created_at: string | null
          has_shipped: boolean | null
          inspection_completed: string | null
          inspection_date: string | null
          installation_completed: string | null
          installation_date: string | null
          installation_id: number | null
          installer_company: string | null
          installer_first_name: string | null
          installer_id: number | null
          installer_last_name: string | null
          job_id: number | null
          job_number: string | null
          rush: boolean | null
          sales_order_id: number | null
          ship_schedule: string | null
          shipping_client_name: string | null
          site_address: string | null
          wrap_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_installer"
            columns: ["installer_id"]
            isOneToOne: false
            referencedRelation: "installers"
            referencedColumns: ["installer_id"]
          },
          {
            foreignKeyName: "fk_jobs_sales_order_id"
            columns: ["sales_order_id"]
            isOneToOne: true
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_jobs_sales_order_id"
            columns: ["sales_order_id"]
            isOneToOne: true
            referencedRelation: "sales_table_view"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_master_view: {
        Row: {
          client_name: string | null
          created_at: string | null
          description: string | null
          display_id: string | null
          due_date: string | null
          id: number | null
          record_type: string | null
        }
        Relationships: []
      }
      plant_table_view: {
        Row: {
          assembly_completed_actual: string | null
          cabinet_box: string | null
          cabinet_color: string | null
          cabinet_door_style: string | null
          cabinet_species: string | null
          client_name: string | null
          custom_finish_completed_actual: string | null
          cut_finish_completed_actual: string | null
          doors_completed_actual: string | null
          has_shipped: boolean | null
          installation_completed: string | null
          installation_id: number | null
          installation_notes: string | null
          job_id: number | null
          job_number: string | null
          paint_completed_actual: string | null
          partially_shipped: boolean | null
          ship_schedule: string | null
          shipping_city: string | null
          shipping_province: string | null
          shipping_street: string | null
          shipping_zip: string | null
          wrap_completed: string | null
          wrap_date: string | null
        }
        Relationships: []
      }
      prod_table_view: {
        Row: {
          assembly_completed_actual: string | null
          cabinet_box: string | null
          cabinet_color: string | null
          cabinet_door_style: string | null
          cabinet_species: string | null
          created_at: string | null
          custom_finish_completed_actual: string | null
          cut_finish_completed_actual: string | null
          cut_melamine_completed_actual: string | null
          doors_completed_actual: string | null
          drawer_completed_actual: string | null
          id: number | null
          in_plant_actual: string | null
          job_number: string | null
          paint_completed_actual: string | null
          placement_date: string | null
          prod_id: number | null
          received_date: string | null
          rush: boolean | null
          sales_order_id: number | null
          ship_schedule: string | null
          ship_status: Database["public"]["Enums"]["ShippingStatus"] | null
          shipping_client_name: string | null
          site_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_jobs_sales_order_id"
            columns: ["sales_order_id"]
            isOneToOne: true
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_jobs_sales_order_id"
            columns: ["sales_order_id"]
            isOneToOne: true
            referencedRelation: "sales_table_view"
            referencedColumns: ["id"]
          },
        ]
      }
      purchasing_table_view: {
        Row: {
          acc_ordered_at: string | null
          acc_received_at: string | null
          acc_received_incomplete_at: string | null
          client_name: string | null
          door_made_in_house: boolean | null
          door_style_name: string | null
          doors_ordered_at: string | null
          doors_received_at: string | null
          doors_received_incomplete_at: string | null
          glass_ordered_at: string | null
          glass_received_at: string | null
          glass_received_incomplete_at: string | null
          handles_ordered_at: string | null
          handles_received_at: string | null
          handles_received_incomplete_at: string | null
          job_id: number | null
          job_number: string | null
          purchase_check_id: number | null
          purchasing_comments: string | null
          sales_order_id: number | null
          ship_schedule: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_jobs_sales_order_id"
            columns: ["sales_order_id"]
            isOneToOne: true
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_jobs_sales_order_id"
            columns: ["sales_order_id"]
            isOneToOne: true
            referencedRelation: "sales_table_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "inspection_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "purchase_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "installation_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "purchase_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "plant_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "purchase_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "prod_table_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "sales_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "purchase_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "service_orders_table_view"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "purchase_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "shipped_not_invoiced_view"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_table_view: {
        Row: {
          created_at: string | null
          deposit: number | null
          designer: string | null
          id: number | null
          invoice_balance: number | null
          job_id: number | null
          job_number: string | null
          sales_order_number: string | null
          ship_schedule: string | null
          shipping_city: string | null
          shipping_client_name: string | null
          shipping_province: string | null
          shipping_street: string | null
          shipping_zip: string | null
          stage: Database["public"]["Enums"]["SalesStage"] | null
          total: number | null
        }
        Relationships: []
      }
      service_orders_table_view: {
        Row: {
          client_name: string | null
          completed_at: string | null
          date_entered: string | null
          due_date: string | null
          installer_company: string | null
          installer_first: string | null
          installer_last: string | null
          installer_requested: boolean | null
          job_id: number | null
          job_number: string | null
          sales_order_id: number | null
          service_order_id: number | null
          service_order_number: string | null
          site_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_jobs_sales_order_id"
            columns: ["sales_order_id"]
            isOneToOne: true
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_jobs_sales_order_id"
            columns: ["sales_order_id"]
            isOneToOne: true
            referencedRelation: "sales_table_view"
            referencedColumns: ["id"]
          },
        ]
      }
      shipped_not_invoiced_view: {
        Row: {
          id: number | null
          job_number: string | null
          ship_date: string | null
          shipping_address: string | null
          shipping_client_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      clerk_uid: { Args: never; Returns: string }
      clerk_user_role: { Args: never; Returns: string }
      create_master_order_transaction: {
        Args: { p_payload: Json }
        Returns: {
          out_job_number: string
          out_sales_order_number: string
        }[]
      }
      generate_next_sales_order_number: {
        Args: { p_stage: Database["public"]["Enums"]["SalesStage"] }
        Returns: string
      }
    }
    Enums: {
      SalesStage: "QUOTE" | "SOLD"
      ShippingStatus: "unprocessed" | "tentative" | "confirmed"
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
      SalesStage: ["QUOTE", "SOLD"],
      ShippingStatus: ["unprocessed", "tentative", "confirmed"],
    },
  },
} as const

