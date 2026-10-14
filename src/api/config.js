import request from '@/utils/request'

export function server () {
  return request({
    url: '/config/server',
    method: 'get',
  })
}

export function app () {
  return request({
    url: '/config/app',
    method: 'get',
  })
}

export function admin () {
  return request({
    url: '/config/admin',
    method: 'get',
  })
}

export function clientBuilder () {
  return request({
    url: '/config/client_builder',
    method: 'get',
  })
}

export function clientBuilderSave (data) {
  return request({
    url: '/config/client_builder',
    method: 'post',
    data,
  })
}
