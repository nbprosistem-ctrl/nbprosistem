import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

export const useKanbanData = () => {
  const queryClient = useQueryClient();

  // Queries
  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/tasks`, { headers: getHeaders() });
      return data;
    },
  });

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/projects`, { headers: getHeaders() });
      return data;
    },
  });

  const servicesQuery = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/admin/services`, { headers: getHeaders() }).catch(() => ({ data: [] }));
      return data;
    },
  });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/admin/users`, { headers: getHeaders() }).catch(() => ({ data: [] }));
      return data;
    },
  });

  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/templates`, { headers: getHeaders() }).catch(() => ({ data: [] }));
      return data;
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/notifications`, { headers: getHeaders() }).catch(() => ({ data: [] }));
      return data;
    },
  });

  const columnNotesQuery = useQuery({
    queryKey: ['columnNotes'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/column-notes`, { headers: getHeaders() }).catch(() => ({ data: {} }));
      return data;
    },
  });

  // Task-specific Queries (Lazy or conditional)
  const getTaskCommentsQuery = (taskId) => ({
    queryKey: ['comments', taskId],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/tasks/${taskId}/comments`, { headers: getHeaders() });
      return data;
    },
    enabled: !!taskId,
  });

  const getTaskAttachmentsQuery = (taskId) => ({
    queryKey: ['attachments', taskId],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/tasks/${taskId}/attachments`, { headers: getHeaders() });
      return data;
    },
    enabled: !!taskId,
  });

  const getTaskHistoryQuery = (taskId) => ({
    queryKey: ['history', taskId],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/api/tasks/${taskId}/history`, { headers: getHeaders() });
      return data;
    },
    enabled: !!taskId,
  });

  // Mutations
  const addCommentMutation = useMutation({
    mutationFn: async ({ taskId, comment }) => {
      const { data } = await axios.post(`${API_URL}/api/tasks/${taskId}/comments`, { comment }, { headers: getHeaders() });
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.taskId] });
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ taskId, formData }) => {
      const { data } = await axios.post(`${API_URL}/api/tasks/${taskId}/attachments`, formData, {
        headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attachments', variables.taskId] });
    },
  });

  const reassignTaskMutation = useMutation({
    mutationFn: async ({ taskId, ownerId }) => {
      await axios.put(`${API_URL}/api/tasks/${taskId}`, 
        { responsible_user_id: ownerId === '' ? null : ownerId },
        { headers: getHeaders() }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const reviewTaskMutation = useMutation({
    mutationFn: async ({ taskId, action, comment }) => {
      await axios.patch(`${API_URL}/api/tasks/${taskId}/review`, 
        { action, comment },
        { headers: getHeaders() }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, status_column }) => {
      await axios.patch(`${API_URL}/api/tasks/${taskId}/status`, 
        { status_column },
        { headers: getHeaders() }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData) => {
      const endpoint = taskData.templateId 
        ? `${API_URL}/api/templates/${taskData.templateId}/apply`
        : `${API_URL}/api/tasks`;
      
      const payload = taskData.templateId
        ? { project_id: taskData.projectId, owner_id: taskData.ownerId || null, due_date: taskData.dueDate || null }
        : taskData;

      await axios.post(endpoint, payload, { headers: getHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      await axios.delete(`${API_URL}/api/tasks/${taskId}`, { headers: getHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const markNotificationAsReadMutation = useMutation({
    mutationFn: async (id) => {
      await axios.patch(`${API_URL}/api/notifications/${id}/read`, {}, { headers: getHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id) => {
      await axios.delete(`${API_URL}/api/notifications/${id}`, { headers: getHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const clearAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`${API_URL}/api/notifications`, { headers: getHeaders() });
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
