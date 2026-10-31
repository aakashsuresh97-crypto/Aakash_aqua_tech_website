// Every table column that can hold an uploaded image URL. The "unused upload" checks (cleanup script, discard endpoint)
// read this list, so a new image column only has to be added here.
module.exports = [
  ['product', 'image_url'],
  ['banner', 'image_url'], ['banner', 'mobile_image_url'],
  ['testimonial', 'image_url'], ['brand', 'logo_url'], ['zone', 'image_url'],
  ['static_page', 'banner_url'], ['blog_post', 'image_url'],
];
