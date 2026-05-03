export default async function handler(req, res) {

  // التأكد من أن الطلب هو POST

  if (req.method !== 'POST') {

    return res.status(405).json({ error: 'غير مسموح بهذه الطريقة' });

  }



  try {

    // الاتصال بخوادم Anthropic بأمان من الخادم

    const response = await fetch('https://api.anthropic.com/v1/messages', {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'x-api-key': process.env.API_KEY, // المفتاح السري سيتم جلبه من إعدادات Vercel

        'anthropic-version': '2023-06-01'

      },

      body: JSON.stringify(req.body)

    });



    const data = await response.json();

    

    // إعادة النتيجة إلى موقعك

    res.status(response.status).json(data);

    

  } catch (error) {

    res.status(500).json({ error: 'حدث خطأ في الاتصال بالخادم الوسيط' });

  }

}
