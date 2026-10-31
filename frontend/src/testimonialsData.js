/* =====================================================================
   REAL CUSTOMER FEEDBACK – copied word-for-word from https://aakashaquatech.in/testimonials/
   Format:  [ 'Customer name', 'Town / city', 'Feedback text' ]
   To add a new review, add one more line at the END of the list (or anywhere you like).
   (The old site shows no star ratings, so every card shows 5 stars – see SHOW_STARS in TestimonialsPage.jsx)
===================================================================== */
export const INTRO = 'Real customer feedback for Aakash Aqua Tech Pvt Ltd water purifier installation, service, and RO plant support.'

const RAW = [
  ['Ramesh', 'Salem', 'Mr. Gubenthiran installed our home RO purifier very neatly. He explained the maintenance process clearly and checked everything before leaving. Water taste is excellent now.'],
  ['Priya', 'Coimbatore', 'Tamil Selvan responded quickly when our purifier stopped working. The issue was fixed within one visit itself. Very professional and polite service.'],
  ['Arun Kumar', 'Bangalore', 'Thamarai Kannan handled the commercial RO installation for our office perfectly. The work was completed on time without any delay. Highly satisfied with the support.'],
  ['Deepa', 'Trichy', 'K Sathish serviced our water purifier professionally and changed only the required parts. Pricing was reasonable and transparent. Good customer approach.'],
  ['Vignesh', 'Dharmapuri', 'Very happy with Gubenthiran service and technical knowledge. He identified the issue quickly and solved it immediately. Highly recommended for RO service.'],
  ['Karthika', 'Salem', 'Tamil Selvan arrived on time and completed the installation cleanly. He also explained filter replacement timings properly. Excellent support.'],
  ['Sathish Kumar', 'Attur', 'Thamarai Kannan provided genuine suggestions based on our water quality. The purifier is working smoothly without any issues. Great experience overall.'],
  ['Meena', 'Pollachi', 'K Sathish repaired our old purifier instead of forcing us to buy a new one. Honest work and affordable service charges. Really appreciated.'],
  ['Rajesh', 'Tiruppur', 'Gubenthiran installed a commercial RO unit for our shop. Water quality improved significantly after installation. Customers are happy too.'],
  ['Hari Prasad', 'Krishnagiri', 'Tamil Selvan was very polite and explained every detail patiently. The installation was neat and professional. Happy with the overall service.'],
  ['Ganesh', 'Salem', 'Thamarai Kannan handled our apartment RO project efficiently. The work was completed within the promised time. Good coordination and support.'],
  ['Sunil', 'Bangalore', 'K Sathish responded immediately during an emergency breakdown. The purifier started working perfectly after service. Reliable technician.'],
  ['Lakshmi', 'Trichy', 'Gubenthiran provided excellent maintenance service for our home purifier. He checked all filters and cleaned the unit properly. Very satisfied.'],
  ['Ravi', 'Coimbatore', 'Tamil Selvan installed the purifier without making any mess. Water flow and taste improved immediately. Professional service experience.'],
  ['Kishore', 'Dharmapuri', 'Very good support from Thamarai Kannan during installation and follow-up. He answered all our questions patiently. Recommended service.'],
  ['Vinoth', 'Krishnagiri', 'K Sathish arrived exactly on time and completed the service quickly. He explained what caused the issue and how to avoid it. Excellent work.'],
  ['Prakash', 'Pollachi', 'Gubenthiran handled our commercial water purifier maintenance professionally. Water output improved a lot after service. Good technical knowledge.'],
  ['Anitha', 'Bangalore', 'Tamil Selvan gave honest suggestions and did not recommend unnecessary replacements. Very trustworthy service. Happy customer.'],
  ['Murugan', 'Salem', 'Thamarai Kannan installed our hotel RO system perfectly. The machine is running smoothly even with heavy usage. Good support team.'],
  ['Arvind', 'Tiruppur', 'K Sathish fixed the low water pressure issue quickly. He checked the entire unit carefully before leaving. Professional technician.'],
  ['Suresh', 'Coimbatore', 'Gubenthiran provided timely service and regular maintenance reminders. The purifier performance has been excellent since installation. Very reliable.'],
  ['Selvi', 'Dharmapuri', 'Tamil Selvan was friendly and professional throughout the service. He explained filter conditions clearly. Very satisfied with the experience.'],
  ['Naveen', 'Salem', 'Thamarai Kannan completed the installation neatly and tested everything properly. Water quality is much better now. Recommended.'],
  ['Aarthi', 'Trichy', 'K Sathish responded quickly through phone and arrived on the same day. Service was clean and professional. Good customer support.'],
  ['Vijay', 'Krishnagiri', 'Gubenthiran solved our purifier issue that other technicians could not fix. Very experienced and knowledgeable person. Great service.'],
  ['Harini', 'Pollachi', 'Tamil Selvan installed the purifier exactly as promised. He explained maintenance tips clearly for long-term usage. Happy with the service.'],
  ['Rohit', 'Bangalore', 'Thamarai Kannan handled our office RO installation professionally. The entire process was smooth and hassle-free. Excellent work.'],
  ['Muthu', 'Salem', 'K Sathish serviced our purifier quickly and replaced only necessary parts. Pricing was fair and transparent. Good experience.'],
  ['Keerthana', 'Coimbatore', 'Gubenthiran provided excellent customer support even after installation. He responds quickly whenever needed. Highly recommended.'],
  ['Ashok', 'Attur', 'Tamil Selvan completed the work neatly and professionally. Water taste improved immediately after service. Very satisfied.'],
  ['Bala', 'Tiruppur', 'Thamarai Kannan suggested the correct RO capacity for our business needs. Installation was completed on time. Good technical support.'],
  ['Rohini', 'Bangalore', 'K Sathish gave proper AMC support and regular maintenance updates. The purifier is functioning perfectly. Reliable service.'],
  ['Kumar', 'Salem', 'Gubenthiran arrived on time and handled the service professionally. He explained the issue clearly before starting work. Honest technician.'],
  ['Saranya', 'Trichy', 'Tamil Selvan installation work was very neat and clean. He checked the water quality after setup too. Excellent support.'],
  ['Dinesh', 'Coimbatore', 'Thamarai Kannan installed a commercial purifier for our restaurant. Water output and quality are very good now. Professional service.'],
  ['Nagaraj', 'Dharmapuri', 'K Sathish solved the purifier leakage issue quickly. He also checked the complete unit for safety. Good experience overall.'],
  ['Srinivasan', 'Krishnagiri', 'Gubenthiran provided excellent technical support during installation. He ensured everything was working properly before leaving. Highly satisfied.'],
  ['Anand', 'Bangalore', 'Tamil Selvan handled our industrial RO setup efficiently. The project was completed within schedule. Great teamwork.'],
  ['Kavin', 'Pollachi', 'Thamarai Kannan was polite and very knowledgeable about water purification systems. Service quality was excellent. Recommended.'],
  ['Manoj', 'Salem', 'K Sathish repaired our purifier at a reasonable price. Water flow improved significantly after service. Happy customer.'],
  ['Rajalakshmi', 'Trichy', 'Gubenthiran provided quick service and genuine spare parts. The purifier is working smoothly now. Very trustworthy.'],
  ['Pradeep', 'Bangalore', 'Tamil Selvan explained every maintenance detail clearly. Installation was completed professionally without delays. Excellent service.'],
  ['Vinay', 'Coimbatore', 'Thamarai Kannan gave honest recommendations based on our water condition. The purifier performance is excellent. Very satisfied.'],
  ['Murali', 'Dharmapuri', 'K Sathish handled the maintenance work professionally and neatly. He checked all filters properly before leaving. Good support.'],
  ['Harish', 'Salem', 'Gubenthiran installed our purifier perfectly and tested water quality immediately. Water tastes much better now. Great service.'],
  ['Kumaravel', 'Attur', 'Tamil Selvan responded quickly and completed the installation on the same day. Very professional approach. Highly recommended.'],
  ['Ramesh B', 'Tiruppur', 'Thamarai Kannan completed the commercial RO setup smoothly. He coordinated everything properly from start to finish. Excellent experience.'],
  ['Jaya', 'Pollachi', 'K Sathish explained how to maintain the purifier correctly. Service was clean, fast, and affordable. Happy with the support.'],
  ['Sathya', 'Krishnagiri', 'Gubenthiran identified the issue immediately and fixed it professionally. Very experienced technician. Recommended for RO service.'],
  ['Mohan', 'Salem', 'Tamil Selvan provided timely service and good customer support. Water quality improved noticeably after maintenance. Satisfied customer.'],
  ['Divya', 'Coimbatore', 'Thamarai Kannan completed the purifier installation neatly and professionally. He explained all features clearly. Good service experience.'],
  ['Balaji', 'Bangalore', 'K Sathish serviced our office purifier quickly and efficiently. The machine is working perfectly now. Reliable technician.'],
  ['Karthik', 'Trichy', 'Gubenthiran provided excellent after-sales support and maintenance guidance. Very genuine service provider. Happy with the work.'],
  ['Rani', 'Dharmapuri', 'Tamil Selvan repaired our purifier quickly and checked the entire system thoroughly. Professional work and affordable pricing.'],
  ['Suresh Kumar', 'Salem', 'Thamarai Kannan installed the purifier exactly as promised. Water quality improved immediately after installation. Great support.'],
  ['Vetri', 'Attur', 'K Sathish handled the maintenance professionally and replaced filters neatly. Very polite and knowledgeable technician.'],
  ['Arthi', 'Tiruppur', 'Gubenthiran arrived on time and solved our water purifier issue quickly. Honest work and reasonable charges. Highly satisfied.'],
  ['Shankar', 'Pollachi', 'Tamil Selvan installed a commercial purifier for our business successfully. Water output is excellent now. Professional service.'],
  ['Nithya', 'Krishnagiri', 'Thamarai Kannan explained maintenance schedules clearly after installation. The purifier is working smoothly without problems. Good experience.'],
  ['Raj Kumar', 'Bangalore', 'K Sathish provided excellent industrial RO service support. The entire setup was completed professionally and on time. Highly recommended.'],
]

export const TESTIMONIALS = RAW.map(([name, place, text], id) => ({ id, name, place, text }))

/* city filter chips: [city, count] – most reviews first */
export const CITY_COUNTS = Object.entries(
  TESTIMONIALS.reduce((a, t) => ((a[t.place] = (a[t.place] || 0) + 1), a), {}),
).sort((a, b) => b[1] - a[1])
