import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useKanbanData = () => {
  const queryClient = useQueryClient();

  // Queries
  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data } = await api.get('/api/tasks');
      return data;
    },
  });

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/api/projects');
      return data;
    },
  });

  const servicesQuery = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/services').catch(() => ({ data: [] }));
      return data;
    },
  });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/users').catch(() => ({ data: [] }));
      return data;
    },
  });

  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data } = await api.get('/api/templates').catch(() => ({ data: [] }));
      return data;
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/api/notifications').catch(() => ({ data: [] }));
      return data;
    },
  });

  const columnNotesQuery = useQuery({
    queryKey: ['columnNotes'],
    queryFn: async () => {
      const { data } = await api.get('/api/column-notes').catch(() => ({ data: {} }));
      return data;
    },
  });

  // Task-specific Queries (Lazy or conditional)
  const getTaskCommentsQuery = (taskId) => ({
    queryKey: ['comments', taskId],
    queryFn: async () => {
      const { data } = await api.get(`/api/tasks/${taskId}/comments`);
      return data;
    },
    enabled: !!taskId,
  });

  const getTaskAttachmentsQuery = (taskId) => ({
    queryKey: ['attachments', taskId],
    queryFn: async () => {
      const { data } = await api.get(`/api/tasks/${taskId}/attachments`);
      return data;
    },
    enabled: !!taskId,
  });

  const getTaskHistoryQuery = (taskId) => ({
    queryKey: ['history', taskId],
    queryFn: async () => {
      const { data } = await api.get(`/api/tasks/${taskId}/history`);
      return data;
    },
    enabled: !!taskId,
  });

  // Mutations
  const addCommentMutation = useMutation({
    mutationFn: async ({ taskId, comment }) => {
      const { data } = await api.post(`/api/tasks/${taskId}/comments`, { comment });
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.taskId] });
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ taskId, formData }) => {
      const { data } = await api.post(`/api/tasks/${taskId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attachments', variables.taskId] });
    },
  });

  const reassignTaskMutation = useMutation({
    mutationFn: async ({ taskId, ownerId }) => {
      await api.put(`/api/tasks/${taskId}`, {
        responsible_user_id: ownerId === '' ? null : ownerId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const reviewTaskMutation = useMutation({
    mutationFn: async ({ taskId, action, comment }) => {
      await api.patch(`/api/tasks/${taskId}/review`, { action, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, status_column }) => {
      await api.patch(`/api/tasks/${taskId}/status`, { status_column });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData) => {
      const endpoint = taskData.templateId 
        ? `/api/templates/${taskData.templateId}/apply`
        : `/api/tasks`;
      
      const payload = taskData.templateId
        ? { project_id: taskData.projectId, owner_id: taskData.ownerId || null, due_date: taskData.dueDate || null }
        : taskData;

      await api.post(endpoint, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      await api.delete(`/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const markNotificationAsReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.patch(`/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const clearAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/api/notifications');
    },
    onSuccess: () => {
      queryClient.setQueryData(['notifications'], []);
    },
  });

  return {
    queries: {
      tasks: tasksQuery,
      projects: projectsQuery,
      services: servicesQuery,
      users: usersQuery,
      templates: templatesQuery,
      notifications: notificationsQuery,
      columnNotes: columnNotesQuery,
      getTaskComments: getTaskCommentsQuery,
      getTaskAttachments: getTaskAttachmentsQuery,
      getTaskHistory: getTaskHistoryQuery,
    },
    mutations: {
      moveTask: moveTaskMutation,
      createTask: createTaskMutation,
      deleteTask: deleteTaskMutation,
      markNotificationAsRead: markNotificationAsReadMutation,
      deleteNotification: deleteNotificationMutation,
      clearAllNotifications: clearAllNotificationsMutation,
      addComment: addCommentMutation,
      uploadAttachment: uploadAttachmentMutation,
      reassignTask: reassignTaskMutation,
      reviewTask: reviewTaskMutation,
    }
  };
};
