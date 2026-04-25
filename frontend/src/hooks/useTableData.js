import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export function useTableData(api, queryKey) {
  const qc = useQueryClient()
  const [params, setParams] = useState({ page: 1, limit: 50 })
  const [sortBy, setSortBy] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, params, search, sortBy, sortOrder],
    queryFn: () => api.getAll({ ...params, search, sortBy, sortOrder }),
  })

  const createM = useMutation({
    mutationFn: api.create,
    onSuccess: () => { qc.invalidateQueries([queryKey]); toast.success('Record created!') },
    onError: (e) => toast.error(e.response?.data?.message || 'Create failed'),
  })
  const updateM = useMutation({
    mutationFn: ({ id, data }) => api.update(id, data),
    onSuccess: () => { qc.invalidateQueries([queryKey]); toast.success('Record updated!') },
    onError: (e) => toast.error(e.response?.data?.message || 'Update failed'),
  })
  const deleteM = useMutation({
    mutationFn: api.remove,
    onSuccess: () => { qc.invalidateQueries([queryKey]); toast.success('Record deleted!') },
    onError: (e) => toast.error(e.response?.data?.message || 'Delete failed'),
  })

  const handleSort = useCallback((key) => {
    if (sortBy === key) setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortOrder('asc') }
    setParams(p => ({ ...p, page: 1 }))
  }, [sortBy])

  const handleSearch = useCallback((val) => {
    setSearch(val)
    setParams(p => ({ ...p, page: 1 }))
  }, [])

  return {
    rows: data?.data || [],
    total: data?.total || 0,
    pages: data?.pages || 1,
    page: params.page,
    isLoading,
    params, sortBy, sortOrder, search,
    handleSort, handleSearch,
    setPage: (p) => setParams(prev => ({ ...prev, page: p })),
    create: createM.mutateAsync,
    update: (id, data) => updateM.mutateAsync({ id, data }),
    remove: deleteM.mutateAsync,
    isCreating: createM.isPending,
    isUpdating: updateM.isPending,
    isDeleting: deleteM.isPending,
  }
}

// For dropdown data
export function useDropdownData(api, queryKey, filters = {}, enabled = true) {
  const { data, isLoading } = useQuery({
    queryKey: [queryKey, 'all', filters],
    queryFn: () => api.getAll({ limit: 1000, ...filters }),
    enabled,
    staleTime: 60000,
  })
  return { options: data?.data || [], isLoading }
}
