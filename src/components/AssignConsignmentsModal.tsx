import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
} from '@mui/material';
import { Delete, Add, DragIndicator } from '@mui/icons-material';
import { MaterialItem } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface Consignment {
  id: string;
  name: string;
  materials: MaterialItem[];
}

interface AssignConsignmentsModalProps {
  open: boolean;
  materials: MaterialItem[];
  onClose: () => void;
  onConfirm: (consignments: Consignment[]) => void;
}

const AssignConsignmentsModal: React.FC<AssignConsignmentsModalProps> = ({
  open,
  materials,
  onClose,
  onConfirm,
}) => {
  const { mode } = useTheme();
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [unassignedMaterials, setUnassignedMaterials] = useState<MaterialItem[]>([]);
  const [draggedMaterial, setDraggedMaterial] = useState<MaterialItem | null>(null);

  // Initialize consignments when materials change
  useEffect(() => {
    if (materials.length > 0) {
      // Start with one empty consignment
      const initialConsignments: Consignment[] = [{
        id: 'consignment_1',
        name: 'Consignment 1',
        materials: [],
      }];
      setConsignments(initialConsignments);
      // All materials start in the unassigned panel
      setUnassignedMaterials(materials);
    }
  }, [materials]);

  const getTextColor = () => mode === 'dark' ? '#FFFFFF' : '#333333';
  const getSecondaryTextColor = () => mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
  const getBorderColor = () => mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(239, 114, 31, 0.2)';
  const getBackgroundColor = () => mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)';

  const handleAddConsignment = () => {
    const newConsignment: Consignment = {
      id: `consignment_${consignments.length + 1}`,
      name: `Consignment ${consignments.length + 1}`,
      materials: [],
    };
    setConsignments([...consignments, newConsignment]);
  };

  const handleDeleteConsignment = (consignmentId: string) => {
    const consignmentToDelete = consignments.find(c => c.id === consignmentId);
    if (consignmentToDelete) {
      // Move materials back to unassigned
      setUnassignedMaterials([...unassignedMaterials, ...consignmentToDelete.materials]);
      setConsignments(consignments.filter(c => c.id !== consignmentId));
    }
  };

  const handleDragStart = (material: MaterialItem, fromConsignmentId?: string) => {
    setDraggedMaterial(material);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (toConsignmentId: string) => {
    if (!draggedMaterial) return;

    // Remove material from its current location
    setConsignments(consignments.map(consignment => ({
      ...consignment,
      materials: consignment.materials.filter(m => m.id !== draggedMaterial.id),
    })));
    setUnassignedMaterials(unassignedMaterials.filter(m => m.id !== draggedMaterial.id));

    // Add material to target consignment
    setConsignments(consignments.map(consignment => {
      if (consignment.id === toConsignmentId) {
        return {
          ...consignment,
          materials: [...consignment.materials, draggedMaterial],
        };
      }
      return consignment;
    }));

    setDraggedMaterial(null);
  };

  const handleDropToUnassigned = () => {
    if (!draggedMaterial) return;

    // Remove material from its current consignment
    setConsignments(consignments.map(consignment => ({
      ...consignment,
      materials: consignment.materials.filter(m => m.id !== draggedMaterial.id),
    })));

    // Add to unassigned
    setUnassignedMaterials([...unassignedMaterials, draggedMaterial]);
    setDraggedMaterial(null);
  };

  const handleConfirm = () => {
    // Filter out empty consignments
    const validConsignments = consignments.filter(c => c.materials.length > 0);
    onConfirm(validConsignments);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: mode === 'dark' ? '#111111' : '#ffffff', // Using --background-secondary from CSS
          minHeight: '70vh',
        }
      }}
    >
      <DialogTitle sx={{ color: getTextColor(), borderBottom: `1px solid ${getBorderColor()}` }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Assign Consignments
        </Typography>
        <Typography variant="body2" sx={{ color: getSecondaryTextColor(), mt: 1 }}>
          Drag and drop materials to assign them to consignments. Each consignment will create a separate order.
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', gap: 3, minHeight: '500px' }}>
          {/* Left side - Consignments */}
          <Box sx={{ flex: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600 }}>
                Consignments
              </Typography>
              <Button
                startIcon={<Add />}
                onClick={handleAddConsignment}
                variant="outlined"
                size="small"
                sx={{
                  color: '#9CA3AF',
                  borderColor: 'rgba(124, 77, 255, 0.3)',
                  '&:hover': { 
                    borderColor: 'rgba(124, 77, 255, 0.5)',
                    bgcolor: 'rgba(124, 77, 255, 0.05)',
                  },
                }}
              >
                Add Consignment
              </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {consignments.map((consignment, index) => (
                <Paper
                  key={consignment.id}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(consignment.id)}
                  sx={{
                    p: 2,
                    border: `2px dashed ${getBorderColor()}`,
                    bgcolor: getBackgroundColor(),
                    minHeight: '120px',
                    position: 'relative',
                    '&:hover': {
                      borderColor: '#9CA3AF',
                      bgcolor: mode === 'dark' ? 'rgba(124, 77, 255, 0.05)' : 'rgba(124, 77, 255, 0.02)',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ color: getTextColor(), fontWeight: 600 }}>
                      {consignment.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteConsignment(consignment.id)}
                      sx={{ color: '#f44336' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, minHeight: '60px' }}>
                    {consignment.materials.length === 0 ? (
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(), fontStyle: 'italic' }}>
                        Drop materials here...
                      </Typography>
                    ) : (
                      consignment.materials.map((material) => (
                        <Chip
                          key={material.id}
                          label={`${material.name} (${material.quantity.value} ${material.quantity.unit})`}
                          draggable
                          onDragStart={() => handleDragStart(material, consignment.id)}
                          icon={<DragIndicator />}
                          sx={{
                            bgcolor: '#9CA3AF',
                            color: 'white',
                            cursor: 'move',
                            '&:hover': {
                              bgcolor: '#6B46C1',
                            }
                          }}
                        />
                      ))
                    )}
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>

          {/* Right side - Unassigned Materials */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ color: getTextColor(), fontWeight: 600, mb: 2 }}>
              Materials
            </Typography>
            <Paper
              onDragOver={handleDragOver}
              onDrop={handleDropToUnassigned}
              sx={{
                p: 2,
                border: `2px solid ${getBorderColor()}`,
                bgcolor: getBackgroundColor(),
                minHeight: '400px',
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {unassignedMaterials.length === 0 ? (
                  <Typography variant="body2" sx={{ color: getSecondaryTextColor(), fontStyle: 'italic' }}>
                    All materials assigned
                  </Typography>
                ) : (
                  unassignedMaterials.map((material) => (
                    <Paper
                      key={material.id}
                      draggable
                      onDragStart={() => handleDragStart(material)}
                      sx={{
                        p: 1.5,
                        cursor: 'move',
                        bgcolor: mode === 'dark' ? 'rgba(124, 77, 255, 0.1)' : 'rgba(124, 77, 255, 0.05)',
                        border: `1px solid ${getBorderColor()}`,
                        '&:hover': {
                          bgcolor: mode === 'dark' ? 'rgba(124, 77, 255, 0.15)' : 'rgba(124, 77, 255, 0.1)',
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DragIndicator sx={{ color: getSecondaryTextColor() }} />
                        <Box>
                          <Typography variant="body2" sx={{ color: getTextColor(), fontWeight: 500 }}>
                            {material.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: getSecondaryTextColor() }}>
                            {material.quantity.value} {material.quantity.unit}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  ))
                )}
              </Box>
            </Paper>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: `1px solid ${getBorderColor()}` }}>
        <Button onClick={onClose} sx={{ color: getSecondaryTextColor() }}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={consignments.filter(c => c.materials.length > 0).length === 0}
          sx={{
            bgcolor: '#9CA3AF',
            '&:hover': { bgcolor: '#6B46C1' },
          }}
        >
          Create Orders
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignConsignmentsModal;
