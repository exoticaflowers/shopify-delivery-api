import { parse, format } from 'date-fns';
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors'; // ✅ Add this after other imports

dotenv.config();

const app = express(); // ✅ Initialize app first
app.use(cors({ origin: '*' })); // ✅ Then use cors

const PORT = process.env.PORT || 3000;


function countDeliveryDates(orders) {
  const dateCounts = {};
  orders.forEach(order => {
const deliveryDate = order.note_attributes.find(attr => attr.name === 'delivery_date');
if (deliveryDate && deliveryDate.value) {
  try {
    // Try parsing with common formats
    const raw = deliveryDate.value;
    let parsedDate;

    if (raw.includes('/')) {
      parsedDate = parse(raw, 'MM/dd/yyyy', new Date());
    } else {
      parsedDate = new Date(raw);
    }

    const formattedDate = format(parsedDate, 'yyyy-MM-dd');
    dateCounts[formattedDate] = (dateCounts[formattedDate] || 0) + 1;
  } catch (e) {
    console.warn('Skipping unrecognized date:', deliveryDate.value);
  }
}

  });
  return dateCounts;
}

app.get('/api/delivery-summary', async (req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 15);
  const sinceISO = since.toISOString();

  try {
    const response = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2023-10/orders.json?status=any&created_at_min=${sinceISO}`, {
      headers: {
        'X-Shopify-Access-Token': process.env.ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    const text = await response.text();

    try {
      const data = JSON.parse(text);
console.log("✅ Orders received from Shopify:", data.orders?.length);
console.dir(data.orders, { depth: null }); // Print full order objects
      const summary = countDeliveryDates(data.orders);
      res.json(summary);
    } catch (parseError) {
      console.error('Shopify returned invalid JSON or error:', text);
      res.status(500).json({ error: 'Invalid JSON from Shopify', raw: text });
    }

  } catch (err) {
    console.error('Error fetching from Shopify:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch orders' });
  }
});

app.listen(PORT, () => console.log(`Running on port ${PORT}`));
