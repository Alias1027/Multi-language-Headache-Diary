const config = require('../../config');
Page({data:{url:''},onLoad(){const url=config.webUrl; if(typeof url==='string' && /^https:\/\/[^\s/@?#]+(?:[/?#]|$)/.test(url))this.setData({url});}});
