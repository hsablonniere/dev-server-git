import _ from 'lodash-es';

setInterval(() => {
  document.querySelector('.clock').textContent = new Date().toISOString();
}, 500);

const $lorem = document.querySelector('.lorem');
const lorem = $lorem.textContent;

$lorem.textContent = _.kebabCase(lorem);
