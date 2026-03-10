import React from 'react';
import {
  Box,
  Button,
  DatePicker,
  Form,
  Label,
  Stack,
  TextArea,
  Textfield,
  useForm
} from '@forge/react';

const MissionForm = ({ onSubmit, onCancel }) => {
  const { handleSubmit, register, getFieldId } = useForm();

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Stack space="space.200">
        <Box>
          <Label labelFor={getFieldId('titre')}>Titre</Label>
          <Textfield
            {...register('titre', { required: true })}
            id={getFieldId('titre')}
            placeholder="Titre de la mission"
          />
        </Box>

        <Box>
          <Label labelFor={getFieldId('destination')}>Destination</Label>
          <Textfield
            {...register('destination', { required: true })}
            id={getFieldId('destination')}
            placeholder="Destination"
          />
        </Box>

        <Box>
          <Label labelFor={getFieldId('pays')}>Pays</Label>
          <Textfield
            {...register('pays', { required: true })}
            id={getFieldId('pays')}
            placeholder="Pays"
          />
        </Box>

        <Box>
          <Label labelFor={getFieldId('ville')}>Ville</Label>
          <Textfield
            {...register('ville', { required: true })}
            id={getFieldId('ville')}
            placeholder="Ville"
          />
        </Box>

        <Box>
          <Label labelFor={getFieldId('dateDepart')}>Date de départ</Label>
          <DatePicker
            {...register('dateDepart', { required: true })}
            id={getFieldId('dateDepart')}
          />
        </Box>

        <Box>
          <Label labelFor={getFieldId('dateRetour')}>Date de retour</Label>
          <DatePicker
            {...register('dateRetour', { required: true })}
            id={getFieldId('dateRetour')}
          />
        </Box>

        <Box>
          <Label labelFor={getFieldId('motif')}>Motif</Label>
          <TextArea
            {...register('motif', { required: true })}
            id={getFieldId('motif')}
            placeholder="Motif de la mission"
          />
        </Box>

        <Stack space="space.100">
          <Button appearance="primary" type="submit">
            Enregistrer
          </Button>

          <Button appearance="subtle" onClick={onCancel}>
            Annuler
          </Button>
        </Stack>
      </Stack>
    </Form>
  );
};

export default MissionForm;