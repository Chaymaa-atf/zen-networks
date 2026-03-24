import React from 'react';
import {
  Box,
  Button,
  DatePicker,
  Form,
  FormSection,
  Heading,
  Inline,
  Label,
  Stack,
  Text,
  TextArea,
  Textfield,
  useForm,
} from '@forge/react';
import { xcss } from '@forge/react';

const cardStyles = xcss({
  backgroundColor: 'color.background.input',
  borderRadius: 'border.radius.200',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  padding: 'space.300',
});

const sectionDividerStyles = xcss({
  borderTopWidth: 'border.width',
  borderTopStyle: 'solid',
  borderTopColor: 'color.border',
  paddingTop: 'space.200',
  marginTop: 'space.100',
});

const MissionForm = ({ onSubmit, onCancel }) => {
  const { handleSubmit, register, getFieldId } = useForm();

  const handleFormSubmit = (data) => {
    onSubmit({ ...data, destination: data.ville });
  };

  return (
    <Stack space="space.300">
      <Stack space="space.050">
        <Heading size="large">Nouvelle mission</Heading>
        <Text color="color.text.subtlest">
          Remplissez les informations pour créer une mission
        </Text>
      </Stack>

      <Box xcss={cardStyles}>
        <Form onSubmit={handleSubmit(handleFormSubmit)}>
          <Stack space="space.200">

            {/* Section Informations générales */}
            <FormSection title="Informations générales">
              <Stack space="space.150">
                <Box>
                  <Label labelFor={getFieldId('titre')}>Titre de la mission</Label>
                  <Textfield
                    {...register('titre', { required: true })}
                    id={getFieldId('titre')}
                    placeholder="Ex : Mission commerciale Paris"
                  />
                </Box>

                <Inline space="space.150" alignBlock="start">
                  <Box xcss={xcss({ flex: '1' })}>
                    <Label labelFor={getFieldId('pays')}>Pays</Label>
                    <Textfield
                      {...register('pays', { required: true })}
                      id={getFieldId('pays')}
                      placeholder="Ex : France"
                    />
                  </Box>
                  <Box xcss={xcss({ flex: '1' })}>
                    <Label labelFor={getFieldId('ville')}>Ville / Destination</Label>
                    <Textfield
                      {...register('ville', { required: true })}
                      id={getFieldId('ville')}
                      placeholder="Ex : Paris"
                    />
                  </Box>
                </Inline>
              </Stack>
            </FormSection>

            <Box xcss={sectionDividerStyles} />

            {/* Section Dates */}
            <FormSection title="Période de la mission">
              <Inline space="space.150" alignBlock="start">
                <Box xcss={xcss({ flex: '1' })}>
                  <Label labelFor={getFieldId('dateDepart')}>Date de départ</Label>
                  <DatePicker
                    {...register('dateDepart', { required: true })}
                    id={getFieldId('dateDepart')}
                  />
                </Box>
                <Box xcss={xcss({ flex: '1' })}>
                  <Label labelFor={getFieldId('dateRetour')}>Date de retour</Label>
                  <DatePicker
                    {...register('dateRetour', { required: true })}
                    id={getFieldId('dateRetour')}
                  />
                </Box>
              </Inline>
            </FormSection>

            <Box xcss={sectionDividerStyles} />

            {/* Section Motif */}
            <FormSection title="Motif">
              <Box>
                <Label labelFor={getFieldId('motif')}>Description du motif</Label>
                <TextArea
                  {...register('motif', { required: true })}
                  id={getFieldId('motif')}
                  placeholder="Décrivez l'objectif et le contexte de la mission..."
                  minimumRows={3}
                />
              </Box>
            </FormSection>

            <Box xcss={sectionDividerStyles} />

            {/* Actions */}
            <Inline space="space.100">
              <Button appearance="primary" type="submit">
                Enregistrer la mission
              </Button>
              <Button appearance="subtle" onClick={onCancel}>
                Annuler
              </Button>
            </Inline>

          </Stack>
        </Form>
      </Box>
    </Stack>
  );
};

export default MissionForm;