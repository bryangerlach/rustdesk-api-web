import request from '@/utils/request'

export function list (params) {
  return request({
    url: '/client_build/list',
    params,
  })
}

export function create (data) {
  return request({
    url: '/client_build/create',
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function refreshStatus (data) {
  return request({
    url: '/client_build/refresh_status',
    method: 'post',
    data,
  })
}

export function remove (data) {
  return request({
    url: '/client_build/delete',
    method: 'post',
    data,
  })
}

export function batchDelete (data) {
  return request({
    url: '/client_build/batchDelete',
    method: 'post',
    data,
  })
}

export function downloadFile (id, file) {
  return request({
    url: `/client_build/download/${id}/${encodeURIComponent(file)}`,
    method: 'get',
    responseType: 'blob',
  })
}