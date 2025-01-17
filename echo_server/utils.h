#ifndef UTILS_H
#define UTILS_H

int send_all(int socket_fd, char *buffer, int length);
int recv_all(int socket_fd, char *buffer, int length);
int valid_port(const char *port_str, int *port);
int create_socket();

#endif
