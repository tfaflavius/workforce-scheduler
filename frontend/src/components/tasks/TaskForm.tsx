import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
} from '@mui/material';
import DatePickerField from '../common/DatePickerField';
import type { Task, CreateTaskRequest, UpdateTaskRequest, TaskPriority, TaskUrgency } from '../../types/task.types';

interface TaskFormProps {
  task?: Task;
  onSubmit: (data: CreateTaskRequest | UpdateTaskRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string;
}

export const TaskForm = ({ task, onSubmit, onCancel, isLoading, error }: TaskFormProps) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'MEDIUM' as TaskPriority,
    urgency: task?.urgency || 'MEDIUM' as TaskUrgency,
    taskType: task?.taskType || '',
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        urgency: task.urgency,
        taskType: task.taskType || '',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      });
    }
  }, [task]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Titlul este obligatoriu';
    }

    if (formData.title.length > 500) {
      newErrors.title = 'Titlul nu poate depăși 500 caractere';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const submitData: CreateTaskRequest | UpdateTaskRequest = {
      title: formData.title.trim(),
      ...(formData.description && { description: formData.description.trim() }),
      priority: formData.priority,
      urgency: formData.urgency,
      ...(formData.taskType && { taskType: formData.taskType.trim() }),
      ...(formData.dueDate && { dueDate: new Date(formData.dueDate).toISOString() }),
    };

    onSubmit(submitData);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        <TextField
          label="Titlu"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          error={!!errors.title}
          helperText={errors.title}
          required
          fullWidth
          autoFocus
        />

        <TextField
          label="Descriere"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          multiline
          rows={4}
          fullWidth
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl fullWidth required>
            <InputLabel>Prioritate</InputLabel>
            <Select
              value={formData.priority}
              label="Prioritate"
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
            >
              <MenuItem value="LOW">LOW</MenuItem>
              <MenuItem value="MEDIUM">MEDIUM</MenuItem>
              <MenuItem value="HIGH">HIGH</MenuItem>
              <MenuItem value="CRITICAL">CRITICAL</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth required>
            <InputLabel>Urgență</InputLabel>
            <Select
              value={formData.urgency}
              label="Urgență"
              onChange={(e) => setFormData({ ...formData, urgency: e.target.value as TaskUrgency })}
            >
              <MenuItem value="LOW">LOW</MenuItem>
              <MenuItem value="MEDIUM">MEDIUM</MenuItem>
              <MenuItem value="HIGH">HIGH</MenuItem>
              <MenuItem value="URGENT">URGENT</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <TextField
          label="Tip Task"
          value={formData.taskType}
          onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
          placeholder="ex: development, bug, feature"
          fullWidth
        />

        <DatePickerField
          label="Data Limită"
          value={formData.dueDate || null}
          onChange={(value) => setFormData({ ...formData, dueDate: value || '' })}
          minDate={new Date().toISOString().split('T')[0]}
          fullWidth
        />

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={isLoading}
          >
            Anulează
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
          >
            {task ? 'Actualizează' : 'Creează'} Task
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};
