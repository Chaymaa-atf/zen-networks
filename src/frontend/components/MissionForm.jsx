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

const normalizeEmpty = (value) => {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed === '' ? undefined : trimmed;
};

const MissionForm = ({ onSubmit, onCancel, initialValues, isEditMode = false }) => {
  const { handleSubmit, register, getFieldId } = useForm();

  const handleFormSubmit = (data) => {
    if (isEditMode) {
      const payload = {};

      const nomEmploye = normalizeEmpty(data.nomEmploye);
      const prenomEmploye = normalizeEmpty(data.prenomEmploye);
      const titre = normalizeEmpty(data.titre);
      const pays = normalizeEmpty(data.pays);
      const ville = normalizeEmpty(data.ville);
      const dateDepart = normalizeEmpty(data.dateDepart);
      const dateRetour = normalizeEmpty(data.dateRetour);
      const motif = normalizeEmpty(data.motif);

      const oldTitre = initialValues?.titre || initialValues?.objet || '';

      if (nomEmploye !== undefined && nomEmploye !== initialValues?.nomEmploye) {
        payload.nomEmploye = nomEmploye;
      }

      if (prenomEmploye !== undefined && prenomEmploye !== initialValues?.prenomEmploye) {
        payload.prenomEmploye = prenomEmploye;
      }

      if (titre !== undefined && titre !== oldTitre) {
        payload.titre = titre;
        payload.objet = titre;
      }

      if (pays !== undefined && pays !== initialValues?.pays) {
        payload.pays = pays;
      }

      if (ville !== undefined && ville !== initialValues?.ville) {
        payload.ville = ville;
        payload.destination = ville;
      }

      if (dateDepart !== undefined && dateDepart !== initialValues?.dateDepart) {
        payload.dateDepart = dateDepart;
      }

      if (dateRetour !== undefined && dateRetour !== initialValues?.dateRetour) {
        payload.dateRetour = dateRetour;
      }

      if (motif !== undefined && motif !== initialValues?.motif) {
        payload.motif = motif;
      }

      onSubmit(payload);
      return;
    }

    onSubmit({
      ...data,
      objet: data.titre,
      destination: data.ville,
    });
  };

  return (
    <Stack space="space.300">
      <Stack space="space.050">
        <Heading size="large">
          {isEditMode ? 'Modifier la mission' : 'Nouvelle mission'}
        </Heading>
        <Text color="color.text.subtlest">
          {isEditMode
            ? 'Modifiez uniquement les champs que vous souhaitez changer'
            : 'Remplissez les informations pour créer une mission'}
        </Text>
      </Stack>

      <Box xcss={cardStyles}>
        <Form onSubmit={handleSubmit(handleFormSubmit)}>
          <Stack space="space.200">
            <FormSection title="Employé concerné">
              <Inline space="space.150" alignBlock="start">
                <Box xcss={xcss({ flex: '1' })}>
                  <Label labelFor={getFieldId('nomEmploye')}>Nom</Label>
                  <Textfield
                    {...register('nomEmploye', { required: !isEditMode })}
                    id={getFieldId('nomEmploye')}
                    placeholder="Ex : Atfani"
                    defaultValue={initialValues?.nomEmploye || ''}
                  />
                </Box>

                <Box xcss={xcss({ flex: '1' })}>
                  <Label labelFor={getFieldId('prenomEmploye')}>Prénom</Label>
                  <Textfield
                    {...register('prenomEmploye', { required: !isEditMode })}
                    id={getFieldId('prenomEmploye')}
                    placeholder="Ex : Chaymaa"
                    defaultValue={initialValues?.prenomEmploye || ''}
                  />
                </Box>
              </Inline>
            </FormSection>

            <Box xcss={sectionDividerStyles} />

            <FormSection title="Informations générales">
              <Stack space="space.150">
                <Box>
                  <Label labelFor={getFieldId('titre')}>Objet</Label>
                  <Textfield
                    {...register('titre', { required: !isEditMode })}
                    id={getFieldId('titre')}
                    placeholder="Ex : Mission commerciale Paris"
                    defaultValue={initialValues?.titre || initialValues?.objet || ''}
                  />
                </Box>

                <Inline space="space.150" alignBlock="start">
                  <Box xcss={xcss({ flex: '1' })}>
                    <Label labelFor={getFieldId('pays')}>Pays</Label>
                    <Textfield
                      {...register('pays', { required: !isEditMode })}
                      id={getFieldId('pays')}
                      placeholder="Ex : France"
                      defaultValue={initialValues?.pays || ''}
                    />
                  </Box>

                  <Box xcss={xcss({ flex: '1' })}>
                    <Label labelFor={getFieldId('ville')}>Ville / Destination</Label>
                    <Textfield
                      {...register('ville', { required: !isEditMode })}
                      id={getFieldId('ville')}
                      placeholder="Ex : Paris"
                      defaultValue={initialValues?.ville || ''}
                    />
                  </Box>
                </Inline>
              </Stack>
            </FormSection>

            <Box xcss={sectionDividerStyles} />

            <FormSection title="Période de la mission">
              <Inline space="space.150" alignBlock="start">
                <Box xcss={xcss({ flex: '1' })}>
                  <Label labelFor={getFieldId('dateDepart')}>Date de départ</Label>
                  <DatePicker
                    {...register('dateDepart', { required: !isEditMode })}
                    id={getFieldId('dateDepart')}
                    defaultValue={initialValues?.dateDepart || ''}
                  />
                </Box>

                <Box xcss={xcss({ flex: '1' })}>
                  <Label labelFor={getFieldId('dateRetour')}>Date de retour</Label>
                  <DatePicker
                    {...register('dateRetour', { required: !isEditMode })}
                    id={getFieldId('dateRetour')}
                    defaultValue={initialValues?.dateRetour || ''}
                  />
                </Box>
              </Inline>
            </FormSection>

            <Box xcss={sectionDividerStyles} />

            <FormSection title="Motif">
              <Box>
                <Label labelFor={getFieldId('motif')}>Description du motif</Label>
                <TextArea
                  {...register('motif', { required: !isEditMode })}
                  id={getFieldId('motif')}
                  placeholder="Décrivez l'objectif et le contexte de la mission..."
                  minimumRows={3}
                  defaultValue={initialValues?.motif || ''}
                />
              </Box>
            </FormSection>

            <Box xcss={sectionDividerStyles} />

            <Inline space="space.100">
              <Button appearance="primary" type="submit">
                {isEditMode ? 'Enregistrer les modifications' : 'Enregistrer la mission'}
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