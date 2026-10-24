export const JOB_DETAILS_SELECT = `
  id, 
  job_number,
  sales_orders (
    shipping_client_name,
    shipping_street,
    shipping_city
  )
`;
