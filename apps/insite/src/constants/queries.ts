export const JOB_DETAILS_SELECT = `
  id, 
  job_number,
  job_base_number,
  job_suffix,
  sales_orders (
    shipping_client_name,
    shipping_street,
    shipping_city
  )
`;
